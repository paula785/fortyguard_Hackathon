"use client";
// ─── Interactive MapLibre Heatmap with Google Maps, Area Marker Tool & Budget Optimizer ───

import { useEffect, useRef, useState, useCallback } from "react";
import { useAppStore } from "@/store/app-store";
import { getFeatureTemp, type HeatmapTileFeature } from "@/lib/fortyguard-types";
import { calculateWHORisk, detectHotspots, simulateCooling } from "@/lib/simulation/thermal-simulator";
import { optimizeInterventions } from "@/lib/catalog/optimizer";
import { calculateIrrigation } from "@/lib/irrigation/water-calculator";
import { buildAOIFromCenter } from "@/lib/fortyguard-client";

// Temperature → color mapping (bright, high-contrast spectrum)
function tempToColor(tempC: number, min: number, max: number): string {
  const t = Math.max(0, Math.min(1, (tempC - min) / Math.max(max - min, 0.5)));
  if (t < 0.25) return `hsl(${190 + t * 40}, 85%, 52%)`;  // cyan-blue (cool)
  if (t < 0.5)  return `hsl(${140 - t * 140}, 90%, 52%)`; // emerald-yellow (warm)
  if (t < 0.75) return `hsl(${45 - t * 35}, 95%, 50%)`;   // orange (hot)
  return `hsl(${12 - t * 12}, 98%, 48%)`;                  // vibrant red (extreme)
}

// Generate smooth circular polygon for target AOI
function createCircleGeoJSON(centerLat: number, centerLon: number, radiusKm: number, points = 64) {
  const coords: [number, number][] = [];
  const kmPerLat = 111.32;
  const kmPerLon = 111.32 * Math.cos((centerLat * Math.PI) / 180);

  for (let i = 0; i <= points; i++) {
    const angle = (i * 2 * Math.PI) / points;
    const dLat = (radiusKm * Math.sin(angle)) / kmPerLat;
    const dLon = (radiusKm * Math.cos(angle)) / kmPerLon;
    coords.push([centerLon + dLon, centerLat + dLat]);
  }

  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        geometry: {
          type: "Polygon" as const,
          coordinates: [coords],
        },
        properties: {
          radiusKm,
          centerLat,
          centerLon,
        },
      },
    ],
  };
}

interface TooltipInfo {
  x: number;
  y: number;
  tempC: number;
  tempF: number;
  coolingDelta?: number;
  tileId?: string | number;
}

type BasemapStyle = "google-hybrid" | "google-roadmap" | "carto-dark" | "carto-light";

const BASEMAP_TILES: Record<BasemapStyle, { tiles: string[]; maxzoom: number; attribution: string }> = {
  "google-hybrid": {
    tiles: [
      "https://mt0.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
      "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
      "https://mt2.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
      "https://mt3.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    ],
    maxzoom: 20,
    attribution: "© Google Maps Hybrid",
  },
  "google-roadmap": {
    tiles: [
      "https://mt0.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
      "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
      "https://mt2.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
      "https://mt3.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    ],
    maxzoom: 20,
    attribution: "© Google Maps Standard",
  },
  "carto-dark": {
    tiles: [
      "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    ],
    maxzoom: 19,
    attribution: "© CARTO Dark",
  },
  "carto-light": {
    tiles: [
      "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
    ],
    maxzoom: 19,
    attribution: "© CARTO Light",
  },
};

export default function HeatMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isLoadingMap, setIsLoadingMap] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string | null>(null);
  const [basemap, setBasemap] = useState<BasemapStyle>("google-hybrid");

  // Marker & Area Selection State
  const [isMarkerMode, setIsMarkerMode] = useState<boolean>(true);
  const [markedCenter, setMarkedCenter] = useState<{ lat: number; lon: number }>({ lat: 33.4484, lon: -112.074 });
  const [selectedRadiusKm, setSelectedRadiusKm] = useState<number>(1.5);
  const [selectedBudget, setSelectedBudget] = useState<number>(250000);
  const [selectedMode, setSelectedMode] = useState<"balanced" | "low_water" | "max_cooling" | "fast_shade">("balanced");
  const [showControlPanel, setShowControlPanel] = useState<boolean>(true);

  const {
    lat,
    lon,
    setLatLon,
    heatmapBefore,
    setHeatmapBefore,
    heatmapAfter,
    setHeatmapAfter,
    interventions,
    setInterventions,
    hotspots,
    setHotspots,
    activeLayer,
    setActiveLayer,
    setBudget,
    setPreferences,
    setTemperatureStats,
    setIrrigationPlan,
    setKPIs,
  } = useAppStore();

  // Sync markedCenter with store lat/lon initially
  useEffect(() => {
    setMarkedCenter({ lat, lon });
  }, [lat, lon]);

  // Initialize MapLibre Map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const initMap = async () => {
      try {
        const mlModule = await import("maplibre-gl");
        const MapClass = mlModule.Map || (mlModule as any).default?.Map || (mlModule as any).default;
        const NavControl = mlModule.NavigationControl || (mlModule as any).default?.NavigationControl;

        if (!MapClass) {
          throw new Error("MapLibre constructor not found");
        }

        const map = new MapClass({
          container: mapContainer.current!,
          style: {
            version: 8,
            sources: {
              "basemap-source": {
                type: "raster",
                tiles: BASEMAP_TILES[basemap].tiles,
                tileSize: 256,
                attribution: BASEMAP_TILES[basemap].attribution,
                maxzoom: BASEMAP_TILES[basemap].maxzoom,
              },
            },
            layers: [
              {
                id: "basemap-layer",
                type: "raster",
                source: "basemap-source",
              },
            ],
          },
          center: [lon, lat],
          zoom: 14,
        });

        if (NavControl) {
          map.addControl(new NavControl(), "bottom-left");
        }

        map.on("load", () => {
          setIsMapLoaded(true);
          mapRef.current = map;
        });

        // Click handler for area marker pin
        map.on("click", (e: any) => {
          const clickedLat = parseFloat(e.lngLat.lat.toFixed(5));
          const clickedLon = parseFloat(e.lngLat.lng.toFixed(5));
          setMarkedCenter({ lat: clickedLat, lon: clickedLon });
          setLatLon(clickedLat, clickedLon);
        });

        map.on("error", (e: unknown) => {
          console.error("Map runtime error:", e);
        });
      } catch (err: unknown) {
        console.error("Failed to initialize map:", err);
        setMapError((err as Error).message);
      }
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fetch initial FortyGuard heatmap on initial map load if empty
  useEffect(() => {
    if (isMapLoaded && !heatmapBefore && !isLoadingMap) {
      handleRunAnalysis();
    }
  }, [isMapLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Center update when markedCenter changes
  useEffect(() => {
    if (mapRef.current && isMapLoaded) {
      mapRef.current.flyTo({
        center: [markedCenter.lon, markedCenter.lat],
        speed: 1.2,
      });
    }
  }, [markedCenter, isMapLoaded]);

  // Update cursor style when in marker mode
  useEffect(() => {
    if (!mapContainer.current) return;
    mapContainer.current.style.cursor = isMarkerMode ? "crosshair" : "grab";
  }, [isMarkerMode]);

  // Switch basemap tiles
  const switchBasemap = (style: BasemapStyle) => {
    setBasemap(style);
    if (!mapRef.current || !isMapLoaded) return;
    const map = mapRef.current;

    try {
      if (map.getLayer("basemap-layer")) map.removeLayer("basemap-layer");
      if (map.getSource("basemap-source")) map.removeSource("basemap-source");

      map.addSource("basemap-source", {
        type: "raster",
        tiles: BASEMAP_TILES[style].tiles,
        tileSize: 256,
        attribution: BASEMAP_TILES[style].attribution,
        maxzoom: BASEMAP_TILES[style].maxzoom,
      });

      const firstLayerId = map.getStyle().layers?.[0]?.id;
      map.addLayer(
        {
          id: "basemap-layer",
          type: "raster",
          source: "basemap-source",
        },
        firstLayerId !== "basemap-layer" ? firstLayerId : undefined
      );
    } catch (e) {
      console.warn("Could not swap basemap source:", e);
    }
  };

  // Render Target AOI Circle & Center Pin
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return;
    const map = mapRef.current;

    try {
      if (map.getLayer("aoi-circle-line")) map.removeLayer("aoi-circle-line");
      if (map.getLayer("aoi-circle-fill")) map.removeLayer("aoi-circle-fill");
      if (map.getLayer("aoi-center-pulse")) map.removeLayer("aoi-center-pulse");
      if (map.getLayer("aoi-center-dot")) map.removeLayer("aoi-center-dot");
      if (map.getSource("aoi-circle-source")) map.removeSource("aoi-circle-source");
      if (map.getSource("aoi-center-source")) map.removeSource("aoi-center-source");
    } catch {
      // Ignore
    }

    const aoiCircleGeoJSON = createCircleGeoJSON(markedCenter.lat, markedCenter.lon, selectedRadiusKm);
    map.addSource("aoi-circle-source", {
      type: "geojson",
      data: aoiCircleGeoJSON,
    });

    map.addLayer({
      id: "aoi-circle-fill",
      type: "fill",
      source: "aoi-circle-source",
      paint: {
        "fill-color": "#10b981",
        "fill-opacity": 0.08,
      },
    });

    map.addLayer({
      id: "aoi-circle-line",
      type: "line",
      source: "aoi-circle-source",
      paint: {
        "line-color": "#34d399",
        "line-width": 2.5,
        "line-dasharray": [2, 2],
      },
    });

    // Center pin marker source
    const centerPoint = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [markedCenter.lon, markedCenter.lat],
          },
          properties: {},
        },
      ],
    };

    map.addSource("aoi-center-source", {
      type: "geojson",
      data: centerPoint,
    });

    map.addLayer({
      id: "aoi-center-pulse",
      type: "circle",
      source: "aoi-center-source",
      paint: {
        "circle-radius": 18,
        "circle-color": "#10b981",
        "circle-opacity": 0.35,
      },
    });

    map.addLayer({
      id: "aoi-center-dot",
      type: "circle",
      source: "aoi-center-source",
      paint: {
        "circle-radius": 8,
        "circle-color": "#34d399",
        "circle-stroke-width": 3,
        "circle-stroke-color": "#ffffff",
      },
    });
  }, [isMapLoaded, markedCenter, selectedRadiusKm]);

  // Update Heatmap Tile Layer when FortyGuard data changes
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return;
    const map = mapRef.current;

    const currentData =
      activeLayer === "heatmap-after" && heatmapAfter
        ? heatmapAfter
        : heatmapBefore?.map_data;

    if (!currentData || !currentData.features || currentData.features.length === 0) return;

    const features = currentData.features as HeatmapTileFeature[];
    const temps = features.map((f) => getFeatureTemp(f));
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);

    const coloredGeoJSON = {
      type: "FeatureCollection",
      features: features.map((f) => {
        const t = getFeatureTemp(f);
        return {
          ...f,
          properties: {
            ...f.properties,
            color: tempToColor(t, minTemp, maxTemp),
            opacity: basemap === "google-hybrid" ? 0.70 : 0.80,
          },
        };
      }),
    };

    try {
      if (map.getLayer("heatmap-outline")) map.removeLayer("heatmap-outline");
      if (map.getLayer("heatmap-fill")) map.removeLayer("heatmap-fill");
      if (map.getSource("heatmap-source")) map.removeSource("heatmap-source");
    } catch {
      // Ignore
    }

    map.addSource("heatmap-source", {
      type: "geojson",
      data: coloredGeoJSON,
    });

    map.addLayer({
      id: "heatmap-fill",
      type: "fill",
      source: "heatmap-source",
      paint: {
        "fill-color": ["get", "color"],
        "fill-opacity": ["get", "opacity"],
      },
    });

    map.addLayer({
      id: "heatmap-outline",
      type: "line",
      source: "heatmap-source",
      paint: {
        "line-color": "rgba(255, 255, 255, 0.4)",
        "line-width": 0.9,
      },
    });

    // Tooltip interaction
    map.on("mousemove", "heatmap-fill", (e: any) => {
      if (e.features && e.features.length > 0) {
        const props = e.features[0].properties;
        const tempC = props.average_temperature ?? props.temperature ?? 35;
        setTooltip({
          x: e.point.x,
          y: e.point.y,
          tempC,
          tempF: parseFloat(((tempC * 9) / 5 + 32).toFixed(1)),
          coolingDelta: props.cooling_delta_f,
          tileId: props.tile_id,
        });
      }
    });

    map.on("mouseleave", "heatmap-fill", () => setTooltip(null));
  }, [isMapLoaded, heatmapBefore, heatmapAfter, activeLayer, basemap]);

  // Render Intervention Markers
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return;
    const map = mapRef.current;

    try {
      if (map.getLayer("interventions-pulse")) map.removeLayer("interventions-pulse");
      if (map.getLayer("interventions-layer")) map.removeLayer("interventions-layer");
      if (map.getSource("interventions-source")) map.removeSource("interventions-source");
    } catch {
      // Ignore
    }

    if (!interventions || interventions.length === 0) return;

    const geojson = {
      type: "FeatureCollection",
      features: interventions.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lon, p.lat] },
        properties: {
          type: p.type,
          name: p.name,
          cooling: p.coolingDeltaF,
          cost: p.cost,
          color: p.type === "tree" ? "#10b981" : "#06b6d4",
        },
      })),
    };

    map.addSource("interventions-source", { type: "geojson", data: geojson });

    map.addLayer({
      id: "interventions-pulse",
      type: "circle",
      source: "interventions-source",
      paint: {
        "circle-radius": 16,
        "circle-color": ["get", "color"],
        "circle-opacity": 0.3,
      },
    });

    map.addLayer({
      id: "interventions-layer",
      type: "circle",
      source: "interventions-source",
      paint: {
        "circle-radius": 8,
        "circle-color": ["get", "color"],
        "circle-stroke-width": 2.5,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.95,
      },
    });
  }, [isMapLoaded, interventions]);

  // Comprehensive FortyGuard Analysis & Optimization on Selected Area
  const handleRunAnalysis = useCallback(async () => {
    setIsLoadingMap(true);
    setAnalysisStatus("Querying FortyGuard Temperature API for marked coordinates...");

    try {
      // 1. Fetch Heatmap
      const res = await fetch("/api/heatmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: markedCenter.lat,
          lon: markedCenter.lon,
          radius_km: selectedRadiusKm,
          date: "2024-07-15",
        }),
      });

      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error || "Failed to fetch thermal heatmap");
      }

      const heatmapResult = json.data;
      setHeatmapBefore(heatmapResult);
      setBudget(selectedBudget);
      setPreferences({ mode: selectedMode });

      setAnalysisStatus("Detecting high-heat corridors and asphalt hotspots...");

      // 2. Detect Hotspots in marked area
      const detected = detectHotspots(heatmapResult, {}, 18);
      setHotspots(detected);

      setAnalysisStatus(`Running knapsack optimizer for $${selectedBudget.toLocaleString()} budget...`);

      // 3. Optimize Interventions for target cost range
      const optResult = optimizeInterventions(detected, selectedBudget, {
        mode: selectedMode,
        aestheticStyle: "modern",
        prioritizeZones: ["transit", "park"],
      });
      setInterventions(optResult.placements);

      setAnalysisStatus("Simulating before/after microclimate cooling physics...");

      // 4. Run Thermal Cooling Simulator
      const simResult = simulateCooling(heatmapResult.map_data, optResult.placements);
      setHeatmapAfter(simResult.afterGeoJSON);
      setTemperatureStats(simResult.stats);

      // 5. Run Diurnal Smart Irrigation
      const irrResult = calculateIrrigation(optResult.placements, null, selectedMode === "low_water");
      setIrrigationPlan(irrResult);

      // 6. Update KPIs
      setKPIs({
        totalBudgetUsed: optResult.totalCost,
        remainingBudget: selectedBudget - optResult.totalCost,
        totalInterventions: optResult.placements.length,
        treeCount: optResult.treeCount,
        structureCount: optResult.structureCount,
        averageCoolingDeltaF: simResult.stats.avgDeltaF,
        maxCoolingDeltaF: simResult.stats.maxDeltaF,
        budgetEfficiencyDollarPerDegree: optResult.totalCost / Math.max(simResult.stats.avgDeltaF, 0.1),
        treeSurvivalRatePercent: 89,
        weeklyWaterSavedGallons: irrResult.savedVsStaticGallons,
        annualCO2OffsetKg: optResult.treeCount * 22,
        coolingEfficacyF: simResult.stats.avgDeltaF,
        waterSavedGallonsPerWeek: irrResult.savedVsStaticGallons,
        assetCoveragePercent: simResult.stats.areaImprovedPercent,
      });

      setAnalysisStatus(`✅ Analysis Complete! ${heatmapResult.map_data.features.length} thermal tiles analyzed.`);
      setTimeout(() => setAnalysisStatus(null), 5000);
    } catch (err: unknown) {
      console.error("Analysis execution error:", err);
      setAnalysisStatus(`❌ Error: ${(err as Error).message}`);
    } finally {
      setIsLoadingMap(false);
    }
  }, [markedCenter, selectedRadiusKm, selectedBudget, selectedMode, setHeatmapBefore, setBudget, setPreferences, setHotspots, setInterventions, setHeatmapAfter, setTemperatureStats, setIrrigationPlan, setKPIs]);

  const minTempC = heatmapBefore
    ? heatmapBefore.stats_data?.temperature_stats?.minimum ?? 30
    : 30;
  const maxTempC = heatmapBefore
    ? heatmapBefore.stats_data?.temperature_stats?.maximum ?? 45
    : 45;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      {/* Map container */}
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />

      {/* Error state */}
      {mapError && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-primary)",
            gap: "1rem",
          }}
        >
          <div style={{ fontSize: "2rem" }}>🗺️</div>
          <p style={{ color: "var(--text-secondary)", textAlign: "center", maxWidth: 300 }}>
            Map failed to load: {mapError}
          </p>
        </div>
      )}

      {/* Top Map Toolbar: Basemap Switcher & Marker Mode Toggle */}
      <div style={{ position: "absolute", top: 14, left: 14, display: "flex", gap: "0.5rem", zIndex: 30, flexWrap: "wrap", alignItems: "center" }}>
        {/* Basemap Switcher */}
        <div className="basemap-switcher">
          <button
            className={`basemap-btn ${basemap === "google-hybrid" ? "active" : ""}`}
            onClick={() => switchBasemap("google-hybrid")}
            title="Google Hybrid Satellite Imagery"
          >
            🛰️ Satellite
          </button>
          <button
            className={`basemap-btn ${basemap === "google-roadmap" ? "active" : ""}`}
            onClick={() => switchBasemap("google-roadmap")}
            title="Google Maps Street Roadmap"
          >
            🗺️ Street Map
          </button>
          <button
            className={`basemap-btn ${basemap === "carto-dark" ? "active" : ""}`}
            onClick={() => switchBasemap("carto-dark")}
            title="Dark Carto Theme"
          >
            🌑 Dark
          </button>
          <button
            className={`basemap-btn ${basemap === "carto-light" ? "active" : ""}`}
            onClick={() => switchBasemap("carto-light")}
            title="Light Clean Theme"
          >
            ☀️ Light
          </button>
        </div>

        {/* Marker Tool Mode Button */}
        <button
          onClick={() => setIsMarkerMode(!isMarkerMode)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.35rem 0.85rem",
            borderRadius: "var(--radius-full)",
            background: isMarkerMode ? "rgba(16, 185, 129, 0.25)" : "rgba(6, 21, 16, 0.88)",
            border: isMarkerMode ? "1.5px solid #34d399" : "1px solid var(--border-medium)",
            color: isMarkerMode ? "#34d399" : "var(--text-secondary)",
            fontSize: "0.78rem",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: isMarkerMode ? "0 0 15px rgba(16,185,129,0.4)" : "var(--shadow-sm)",
            backdropFilter: "blur(12px)",
            transition: "all 0.2s ease",
          }}
        >
          <span>📍</span>
          <span>{isMarkerMode ? "Marker Tool: Active (Click map)" : "Enable Area Marker"}</span>
        </button>

        {/* Toggle Control Center Button */}
        <button
          onClick={() => setShowControlPanel(!showControlPanel)}
          style={{
            padding: "0.35rem 0.75rem",
            borderRadius: "var(--radius-full)",
            background: "rgba(6, 21, 16, 0.88)",
            border: "1px solid var(--border-medium)",
            color: "var(--text-primary)",
            fontSize: "0.78rem",
            fontWeight: 600,
            cursor: "pointer",
            backdropFilter: "blur(12px)",
          }}
        >
          {showControlPanel ? "⚙️ Hide Panel" : "⚙️ Area & Budget Controls"}
        </button>
      </div>

      {/* Before / After Thermal Layer Toggle */}
      {heatmapBefore && (
        <div className="map-top-bar" style={{ right: 14 }}>
          <button
            className={`map-toggle-btn ${activeLayer === "heatmap-before" ? "active" : ""}`}
            onClick={() => setActiveLayer("heatmap-before")}
          >
            Baseline Heat
          </button>
          <button
            className={`map-toggle-btn ${activeLayer === "heatmap-after" ? "active" : ""}`}
            onClick={() => setActiveLayer("heatmap-after")}
            disabled={!heatmapAfter}
          >
            Simulated Cooling
          </button>
        </div>
      )}

      {/* Floating Target Area & Budget Control Center Panel */}
      {showControlPanel && (
        <div
          className="glass-card"
          style={{
            position: "absolute",
            top: 68,
            left: 14,
            width: 330,
            padding: "1rem",
            zIndex: 25,
            display: "flex",
            flexDirection: "column",
            gap: "0.85rem",
            boxShadow: "0 12px 35px rgba(0,0,0,0.6)",
            border: "1px solid var(--border-accent)",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "1.1rem" }}>📍</span>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-primary)" }}>
                  Target Area & Budget
                </div>
                <div style={{ fontSize: "0.68rem", color: "var(--accent-green-bright)" }}>
                  Click anywhere on map to reposition pin
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowControlPanel(false)}
              style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.9rem" }}
            >
              ✕
            </button>
          </div>

          {/* Marked Coordinates Display */}
          <div style={{ background: "rgba(0, 0, 0, 0.35)", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-sm)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                Center Coordinates
              </div>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#34d399", fontFamily: "monospace" }}>
                {markedCenter.lat.toFixed(4)}°N, {markedCenter.lon.toFixed(4)}°W
              </div>
            </div>
            <span className="pill pill-live" style={{ fontSize: "0.65rem" }}>
              Active Pin
            </span>
          </div>

          {/* AOI Radius Selector */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
              <span>Analysis Radius (AOI)</span>
              <strong style={{ color: "var(--text-primary)" }}>{selectedRadiusKm} km ({Math.round(selectedRadiusKm * 0.621)} mi)</strong>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.25rem" }}>
              {[0.5, 1.0, 1.5, 2.0, 3.0].map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRadiusKm(r)}
                  style={{
                    padding: "0.35rem 0.2rem",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    borderRadius: "var(--radius-sm)",
                    background: selectedRadiusKm === r ? "rgba(16, 185, 129, 0.25)" : "rgba(255, 255, 255, 0.04)",
                    border: selectedRadiusKm === r ? "1px solid #34d399" : "1px solid transparent",
                    color: selectedRadiusKm === r ? "#34d399" : "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  {r}k
                </button>
              ))}
            </div>
          </div>

          {/* Cost Range Slider */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
              <span>Cost Range (Budget Cap)</span>
              <strong style={{ color: "var(--accent-gold-bright)", fontSize: "0.85rem" }}>
                ${selectedBudget.toLocaleString()}
              </strong>
            </div>
            <input
              type="range"
              min={10000}
              max={1000000}
              step={10000}
              value={selectedBudget}
              onChange={(e) => setSelectedBudget(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#10b981", cursor: "pointer" }}
            />
            <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.35rem" }}>
              {[50000, 150000, 250000, 500000].map((b) => (
                <button
                  key={b}
                  onClick={() => setSelectedBudget(b)}
                  style={{
                    flex: 1,
                    padding: "0.2rem 0",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    borderRadius: "var(--radius-sm)",
                    background: selectedBudget === b ? "rgba(245, 158, 11, 0.2)" : "rgba(255, 255, 255, 0.03)",
                    border: selectedBudget === b ? "1px solid var(--accent-gold-bright)" : "1px solid transparent",
                    color: selectedBudget === b ? "var(--accent-gold-bright)" : "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  ${b >= 1000000 ? `${b / 1000000}M` : `${b / 1000}K`}
                </button>
              ))}
            </div>
          </div>

          {/* Priority Strategy Mode */}
          <div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
              Optimization Strategy
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.3rem" }}>
              {[
                { id: "balanced", label: "⚖️ Balanced" },
                { id: "low_water", label: "💧 Low Water" },
                { id: "max_cooling", label: "❄️ Max Cooling" },
                { id: "fast_shade", label: "⚡ Fast Shade" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMode(m.id as any)}
                  style={{
                    padding: "0.35rem 0.4rem",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    borderRadius: "var(--radius-sm)",
                    background: selectedMode === m.id ? "rgba(16, 185, 129, 0.25)" : "rgba(255, 255, 255, 0.03)",
                    border: selectedMode === m.id ? "1px solid #34d399" : "1px solid transparent",
                    color: selectedMode === m.id ? "#34d399" : "var(--text-muted)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Action Button: Run FortyGuard Analysis */}
          <button
            className="btn-primary"
            onClick={handleRunAnalysis}
            disabled={isLoadingMap}
            style={{
              width: "100%",
              padding: "0.75rem",
              fontSize: "0.85rem",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              marginTop: "0.2rem",
            }}
          >
            {isLoadingMap ? (
              <>
                <div
                  style={{
                    width: 14,
                    height: 14,
                    border: "2px solid #ffffff",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
                Processing FortyGuard API...
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Analyze Marked Area & Optimize</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Real-time Status Toast */}
      {analysisStatus && (
        <div
          style={{
            position: "absolute",
            bottom: 75,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 40,
            display: "flex",
            alignItems: "center",
            gap: "0.65rem",
            background: "rgba(6, 21, 16, 0.96)",
            border: "1px solid #34d399",
            borderRadius: "var(--radius-full)",
            padding: "0.65rem 1.4rem",
            fontSize: "0.82rem",
            fontWeight: 700,
            color: "#34d399",
            boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
          }}
        >
          {isLoadingMap && (
            <div
              style={{
                width: 14,
                height: 14,
                border: "2px solid #34d399",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
          )}
          {analysisStatus}
        </div>
      )}

      {/* Hover Tooltip */}
      {tooltip && (
        <div
          style={{
            position: "absolute",
            left: tooltip.x + 14,
            top: tooltip.y - 42,
            background: "rgba(6, 21, 16, 0.95)",
            border: "1px solid var(--border-accent)",
            borderRadius: "var(--radius-sm)",
            padding: "0.45rem 0.75rem",
            fontSize: "0.78rem",
            color: "var(--text-primary)",
            pointerEvents: "none",
            zIndex: 30,
            whiteSpace: "nowrap",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <strong>{tooltip.tempF}°F</strong> ({tooltip.tempC.toFixed(1)}°C)
          {tooltip.tileId !== undefined && (
            <span style={{ color: "var(--text-muted)", marginLeft: 6, fontSize: "0.7rem" }}>
              Tile #{tooltip.tileId}
            </span>
          )}
          {tooltip.coolingDelta && tooltip.coolingDelta > 0 && (
            <span style={{ color: "#34d399", marginLeft: 6, fontWeight: 700 }}>
              −{tooltip.coolingDelta.toFixed(1)}°F Cooling
            </span>
          )}
        </div>
      )}

      {/* Temperature Legend */}
      <div className="temp-legend">
        <div style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
          FortyGuard Thermal Scale
        </div>
        <div className="temp-bar" />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600 }}>
          <span>{((minTempC * 9) / 5 + 32).toFixed(0)}°F (Cool)</span>
          <span>{((maxTempC * 9) / 5 + 32).toFixed(0)}°F (Hot)</span>
        </div>
        {interventions && interventions.length > 0 && (
          <div style={{ marginTop: "0.6rem", paddingTop: "0.5rem", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
              Interventions ({interventions.length})
            </div>
            <div style={{ display: "flex", gap: "0.65rem", fontSize: "0.72rem" }}>
              <span style={{ color: "#34d399" }}>🟢 Trees ({interventions.filter((i) => i.type === "tree").length})</span>
              <span style={{ color: "#06b6d4" }}>🔵 Structures ({interventions.filter((i) => i.type === "shade_structure").length})</span>
            </div>
          </div>
        )}
      </div>

      {/* WHO Heat-Risk Sentinel & Anomaly Card */}
      {heatmapBefore && (
        <div
          style={{
            position: "absolute",
            bottom: 14,
            left: 14,
            background: "rgba(6, 21, 16, 0.94)",
            border: "1px solid var(--border-medium)",
            borderRadius: "var(--radius-md)",
            padding: "0.65rem 0.85rem",
            zIndex: 20,
            boxShadow: "var(--shadow-md)",
            maxWidth: 260,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>
              WHO Heat-Risk Index
            </span>
            <span
              className="pill"
              style={{
                background: maxTempC >= 38 ? "rgba(239, 68, 68, 0.2)" : maxTempC >= 34 ? "rgba(249, 115, 22, 0.2)" : "rgba(16, 185, 129, 0.2)",
                color: maxTempC >= 38 ? "#fca5a5" : maxTempC >= 34 ? "#fdba74" : "#34d399",
                fontSize: "0.65rem",
              }}
            >
              {maxTempC >= 38 ? "🚨 Extreme Alert" : maxTempC >= 34 ? "⚠️ High Risk" : "🌱 Moderate"}
            </span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.35 }}>
            {maxTempC >= 38
              ? "Peak surface temperatures over 100°F detected. Elevated risk of pedestrian heatstroke."
              : "Moderate solar thermal absorption across unshaded asphalt."}
          </div>
        </div>
      )}
    </div>
  );
}
