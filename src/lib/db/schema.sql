-- ============================================================================
-- UrbanCool AI - PostGIS Spatial Database Schema
-- Version: 1.0.0-PROD (Aligned with PRD Section 2, 4.1, 4.4)
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. Projects & Study Areas
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    target_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    granularity_meters INT NOT NULL DEFAULT 100,
    microgrid_resolution_meters INT NOT NULL DEFAULT 10,
    boundary_geom GEOMETRY(Polygon, 4326) NOT NULL,
    authorized_budget_usd NUMERIC(12, 2) NOT NULL DEFAULT 250000.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_boundary ON projects USING GIST (boundary_geom);

-- 3. Analysis Jobs & Diagnostic Orchestration
CREATE TABLE IF NOT EXISTS analysis_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSING, SPATIAL_OPTIMIZATION, COMPLETED, FAILED
    stage VARCHAR(100) NOT NULL DEFAULT 'INITIALIZING',
    progress_percentage INT NOT NULL DEFAULT 0,
    
    -- FortyGuard Activity IDs
    fg_heatmap_activity_id VARCHAR(255),
    fg_satellite_activity_id VARCHAR(255),
    fg_streetview_activity_id VARCHAR(255),
    fg_env_activity_id VARCHAR(255),
    
    -- Raw Payload Caching
    raw_heatmap_geojson JSONB,
    raw_satellite_geojson JSONB,
    raw_streetview_geojson JSONB,
    raw_env_params JSONB,
    
    errors JSONB DEFAULT '[]'::jsonb,
    estimated_duration_sec INT DEFAULT 25,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status ON analysis_jobs (status);

-- 4. Discretized 10m x 10m Micro-Grid (PRD Section 4.1)
CREATE TABLE IF NOT EXISTS spatial_microgrids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
    cell_index INT NOT NULL,
    geom GEOMETRY(Polygon, 4326) NOT NULL,
    centroid_geom GEOMETRY(Point, 4326) NOT NULL,
    
    -- Physical Attributes
    area_sqm NUMERIC(8, 2) NOT NULL DEFAULT 100.00,
    plantable_area_sqm NUMERIC(8, 2) NOT NULL DEFAULT 100.00,
    baseline_temperature_celsius NUMERIC(5, 2) NOT NULL,
    surface_type VARCHAR(50) NOT NULL DEFAULT 'asphalt', -- asphalt, concrete, bare_soil, turf, existing_tree
    current_shadow_ratio NUMERIC(4, 3) NOT NULL DEFAULT 0.0,
    pedestrian_exposure_score NUMERIC(4, 3) NOT NULL DEFAULT 0.5,
    sky_view_factor NUMERIC(4, 3) NOT NULL DEFAULT 0.85,
    
    -- Optimization Scoring (PRD Section 4.2)
    is_plantable BOOLEAN NOT NULL DEFAULT TRUE,
    mcda_priority_score NUMERIC(8, 4) NOT NULL DEFAULT 0.0,
    marginal_cooling_coefficient NUMERIC(8, 6) NOT NULL DEFAULT 0.0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_microgrids_job_id ON spatial_microgrids (job_id);
CREATE INDEX IF NOT EXISTS idx_microgrids_geom ON spatial_microgrids USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_microgrids_centroid ON spatial_microgrids USING GIST (centroid_geom);
CREATE INDEX IF NOT EXISTS idx_microgrids_priority ON spatial_microgrids (job_id, mcda_priority_score DESC);

-- 5. Interventions & Placed Cooling Assets
CREATE TABLE IF NOT EXISTS interventions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
    microgrid_id UUID REFERENCES spatial_microgrids(id) ON DELETE SET NULL,
    asset_type VARCHAR(50) NOT NULL, -- tree, tensile_shade, solar_pergola, cool_pavement, bioswale
    item_id VARCHAR(100) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    location_geom GEOMETRY(Point, 4326) NOT NULL,
    
    -- Thermodynamic Impact
    unit_cost_usd NUMERIC(10, 2) NOT NULL,
    projected_cooling_celsius NUMERIC(5, 2) NOT NULL,
    shade_coverage_sqm NUMERIC(8, 2) NOT NULL,
    annual_water_liters NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    annual_energy_savings_usd NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interventions_job ON interventions (job_id);
CREATE INDEX IF NOT EXISTS idx_interventions_geom ON interventions USING GIST (location_geom);

-- 6. Spatial Grid Generator Function (PRD Section 4.1 ST_MakeGrid)
CREATE OR REPLACE FUNCTION generate_aoi_microgrid(
    p_job_id UUID,
    p_aoi_geom GEOMETRY,
    p_cell_size_deg DOUBLE PRECISION DEFAULT 0.0001 -- ~10m at equator
)
RETURNS INT AS $$
DECLARE
    v_cell_count INT;
BEGIN
    INSERT INTO spatial_microgrids (
        job_id,
        cell_index,
        geom,
        centroid_geom,
        area_sqm,
        plantable_area_sqm,
        baseline_temperature_celsius,
        surface_type,
        current_shadow_ratio,
        pedestrian_exposure_score,
        sky_view_factor,
        is_plantable,
        marginal_cooling_coefficient
    )
    SELECT
        p_job_id,
        ROW_NUMBER() OVER () as cell_index,
        grid.geom,
        ST_Centroid(grid.geom) as centroid_geom,
        100.00,
        100.00,
        38.5,
        'asphalt',
        0.1,
        0.7,
        0.85,
        TRUE,
        0.0085
    FROM (
        SELECT (ST_Dump(ST_MakeGrid(p_aoi_geom, p_cell_size_deg, p_cell_size_deg))).geom
    ) grid
    WHERE ST_Intersects(grid.geom, p_aoi_geom);

    GET DIAGNOSTICS v_cell_count = ROW_COUNT;
    RETURN v_cell_count;
END;
$$ LANGUAGE plpgsql;
