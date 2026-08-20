// ─── FortyGuard API TypeScript Interfaces ─────────────────────────────────────

// ── Common ──────────────────────────────────────────────────────────────────
export interface GeoJSONPolygonFeature {
  type: "Feature";
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
  properties?: Record<string, unknown>;
}

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONPolygonFeature[];
}

export type FilterType = 1 | 2 | 3 | 4; // 1=single hour, 2=hour range, 3=single day, 4=day range

export interface DateTimeParams {
  start_date: string;          // YYYY-MM-DD
  filter_type: FilterType;
  start_time?: string;         // HH:MM (required for filter 1, 2)
  end_time?: string;           // HH:MM (required for filter 2)
  end_date?: string;           // YYYY-MM-DD (required for filter 4)
}

export type AnalyticType = "tcm" | "time_of_measure" | "exceedance" | "persistence";
export type ThresholdDirection = "above" | "below";
export type Granularity = 60 | 80 | 100;

// ── Heatmap ──────────────────────────────────────────────────────────────────
export interface HeatmapRequest {
  polygon_aoi: GeoJSONFeatureCollection;
  date_time: DateTimeParams;
  granularity: Granularity;
  analytic_type?: AnalyticType;
  threshold?: number;          // °C, default 30
  direction?: ThresholdDirection;
}

export interface HeatmapTileFeature {
  type: "Feature";
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
  properties: {
    average_temperature?: number; // °C from FortyGuard API
    temperature?: number;         // °C fallback/internal
    min_temperature?: number;
    max_temperature?: number;
    tile_id?: number | string;
    cooling_delta_f?: number;
    surface_type?: string;
    color?: string;
    opacity?: number;
    original_temp_c?: number;
    cell_id?: string;
    lat?: number;
    lon?: number;
  };
}

export function getFeatureTemp(f: HeatmapTileFeature): number {
  return f.properties.average_temperature ?? f.properties.temperature ?? 35.0;
}

export interface HeatmapStats {
  temperature_stats: {
    minimum: number;
    maximum: number;
    mean: number;
    standard_deviation: number;
  };
  overall_temperature_distribution?: number[];
  normal_temperature_distribution?: {
    x_axis: number[];
    y_axis: number[];
  };
  temperature_frequency?: number[] | { x_axis: number[]; y_axis: number[] };
}

export interface HeatmapResult {
  activity_id?: string;
  map_data: {
    type: "FeatureCollection";
    features: HeatmapTileFeature[];
  };
  stats_data: HeatmapStats;
}

// ── Satellite View Segmentation ───────────────────────────────────────────────
export interface SatelliteRequest {
  sat: {
    latitude: number;
    longitude: number;
  };
  date_time: DateTimeParams;
  granularity: Granularity;
}

export interface SegmentationResult {
  image_dimensions: { height: number; width: number };
  mode: string;
  processing_time_seconds: number;
  request_id: string;
  segments: Record<string, number>;  // class_name -> coverage %
  image_legend: Record<string, [number, number, number]>; // class -> RGB
  image_content: string;             // base64 PNG
}

export interface SatelliteResult {
  activity_id?: string;
  coordinates: { latitude: number; longitude: number };
  orignal_image?: string[];           // base64 PNGs (note: API typo "orignal")
  image_year?: number;
  segmentation?: SegmentationResult;
}

// ── Street View Segmentation ──────────────────────────────────────────────────
export interface StreetViewRequest {
  latitude: number;
  longitude: number;
  vertical_angle: number;
  horizontal_angle: number;
  back_view: boolean;
}

export interface StreetViewSegment {
  original_image: string;            // base64
  segments: Record<string, number>;
  image_legend: Record<string, [number, number, number]>;
  segmented_image: string;           // base64
  image_date: string;                // YYYY-MM-DD
}

export interface StreetViewResult {
  coordinates: { latitude: number; longitude: number };
  front: StreetViewSegment;
  back?: StreetViewSegment;
}

// ── Heat Intelligence ─────────────────────────────────────────────────────────
export type HeatAnalysisType = "geographic" | "environmental" | "urban" | "events" | "anthropogenic";

export interface HeatIntelRequest {
  latitude: number;
  longitude: number;
  temperature: number;            // °C
  date: string;                   // YYYY-MM-DD
  analysis: HeatAnalysisType[];
}

export interface HeatIntelResult {
  download_link: string;          // Signed URL to PDF
}

// ── Environmental Parameters ──────────────────────────────────────────────────
export type EnvParamKey =
  | "heat_index_celsius"
  | "apparent_temperature_celsius"
  | "wet_bulb_temperature_celsius"
  | "relative_humidity_percent"
  | "precipitation_mm"
  | "cloud_cover_octas"
  | "elevation"
  | "air_quality:idx"
  | "air_quality_pm2p5:idx"
  | "air_quality_pm10:idx"
  | "air_quality_no2:idx"
  | "aqi_us_co"
  | "air_quality_o3:idx"
  | "air_quality_so2:idx"
  | "methane_ppb"
  | "co2_ppm"
  | "solar_irradiance";

export interface EnvParamsRequest {
  latitude: number;
  longitude: number;
  temperature: number;            // °C
  date_time: DateTimeParams;
  analysis?: EnvParamKey[];       // omit to get all
}

export interface SolarIrradiance {
  clear_sky: {
    ghi: number;  // Global Horizontal Irradiance W/m²
    dni: number;  // Direct Normal Irradiance
    dhi: number;  // Diffuse Horizontal Irradiance
  };
  description: string;
}

export interface EnvParamLocation {
  lat: number;
  lon: number;
  elevation: number;
  temperature: number;
  parameters: {
    heat_index_celsius?: (number | null)[];
    apparent_temperature_celsius?: (number | null)[];
    wet_bulb_temperature_celsius?: (number | null)[];
    relative_humidity_percent?: (number | null)[];
    precipitation_mm?: (number | null)[];
    cloud_cover_octas?: (number | null)[];
    elevation?: (number | null)[];
    "air_quality:idx"?: (number | null)[];
    "air_quality_pm2p5:idx"?: (number | null)[];
    solar_irradiance?: SolarIrradiance;
  };
}

export interface EnvParamsResult {
  activity_id?: string;
  temperature_c?: number;
  result?: {
    metadata: {
      timezone: string;
      time_range: {
        start: string;
        end: string;
        interval: string;
        count: number;
      };
      timestamps: string[];
    };
    locations: EnvParamLocation[];
  };
}

// ── Check Status ──────────────────────────────────────────────────────────────
export type ActivityStatus = "Processing" | "Completed" | "Failed";

export interface StatusResponse<T = unknown> {
  status: ActivityStatus;
  activity_id: string;
  result?: T;
  message?: string;
}

export interface ActivityResponse {
  activity_id: string;
}

// ── App-specific types ────────────────────────────────────────────────────────
export interface Hotspot {
  id: string;
  lat: number;
  lon: number;
  temperature?: number;     // °C
  tempC?: number;
  temperatureC?: number;
  tempF?: number;
  temperatureF: number;    // °F
  surfaceType: string;     // from satellite segmentation
  priority: "critical" | "high" | "medium";
  areaM2?: number;
  shadePercent?: number;
  coordinates?: number[][][]; // tile polygon
  recommendedAction?: string;
  context?: string;
}

export interface InterventionPlacement {
  id: string;
  type: "tree" | "shade_structure";
  catalogItemId: string;
  name: string;
  lat: number;
  lon: number;
  cost: number;
  coolingDeltaF: number;
  waterGalPerDay: number;
  coverageM2: number;
  shapeGeoJSON?: GeoJSONPolygonFeature;
}

export interface TemperatureStats {
  avgBeforeF?: number;
  avgAfterF?: number;
  beforeAvgF?: number;
  afterAvgF?: number;
  avgDeltaF: number;
  maxDeltaF: number;
  areaImprovedPercent: number;
}

export interface IrrigationWindow {
  startHour: number;
  endHour: number;
  label: string;         // "Pre-dawn optimal"
  timeRange?: string;
}

export interface PlantIrrigationPlan {
  plantId: string;
  plantName: string;
  speciesName: string;
  dailyGallons: number;
  weeklyGallons: number;
  optimalWindow: IrrigationWindow;
  droughtAdjustmentFactor: number;
}

export interface IrrigationPlan {
  totalDailyGallons: number;
  totalWeeklyGallons: number;
  savedVsStaticGallons: number;
  plants: PlantIrrigationPlan[];
  droughtMode: boolean;
  wateringWindows: IrrigationWindow[];
}

export interface KPIReport {
  coolingEfficacyF: number;
  budgetEfficiencyDollarPerDegree: number;
  waterSavedGallonsPerWeek: number;
  assetCoveragePercent: number;
  treeSurvivalRatePercent: number;
  totalBudgetUsed: number;
  totalInterventions: number;
  remainingBudget?: number;
  treeCount?: number;
  structureCount?: number;
  averageCoolingDeltaF?: number;
  maxCoolingDeltaF?: number;
  weeklyWaterSavedGallons?: number;
  annualCO2OffsetKg?: number;
}

export interface UserPreferences {
  mode: "low_water" | "fast_shade" | "max_cooling" | "balanced";
  aestheticStyle?: "modern" | "traditional" | "natural";
  prioritizeZones?: ("transit" | "school" | "senior" | "park")[];
}

export interface UrbanCanopyProject {
  id: string;
  city: string;
  areaName: string;
  budgetCap: number;
  preferences: UserPreferences;
  aoi: GeoJSONFeatureCollection;
  hotspots: Hotspot[];
  interventions: InterventionPlacement[];
  temperatureStats: TemperatureStats | null;
  irrigationPlan: IrrigationPlan | null;
  kpis: KPIReport | null;
  createdAt: string;
}
