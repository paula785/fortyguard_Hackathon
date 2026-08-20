"use client";
// ─── Interactive MapLibre Heatmap with Google Maps & Multi-Style Basemaps ───

import { useEffect, useRef, useState, useCallback } from "react";
import { useAppStore } from "@/store/app-store";
import type { HeatmapTileFeature } from "@/lib/fortyguard-types";

// Temperature → color mapping (bright, high-contrast spectrum)
function tempToColor(tempC: number, min: number, max: number): string {
  const t = Math.max(0, Math.min(1, (tempC - min) / Math.max(max - min, 1)));
  if (t < 0.25) return `hsl(${190 + t * 40}, 85%, 52%)`;  // cyan-blue (cool)
  if (t < 0.5)  return `hsl(${140 - t * 140}, 90%, 52%)`; // emerald-yellow (warm)
  if (t < 0.75) return `hsl(${45 - t * 35}, 95%, 50%)`;   // orange (hot)
  return `hsl(${12 - t * 12}, 98%, 48%)`;                  // vibrant red (extreme)
}

interface TooltipInfo {
  x: number;
  y: number;
  tempC: number;
  tempF: number;
  coolingDelta?: number;
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
  const [basemap, setBasemap] = useState<BasemapStyle>("google-hybrid");

  const {
    lat,
    lon,
    heatmapBefore,
    heatmapAfter,
    interventions,
    hotspots,
    activeLayer,
    setActiveLayer,
    budget,
  } = useAppStore();

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

  // Center update when city coords change
  useEffect(() => {
    if (mapRef.current && isMapLoaded) {
      mapRef.current.flyTo({
        center: [lon, lat],
        zoom: 14,
        speed: 1.2,
      });
    }
  }, [lat, lon, isMapLoaded]);

  // Switch basemap tiles
  const switchBasemap = (style: BasemapStyle) => {
    setBasemap(style);
    if (!mapRef.current || !isMapLoaded) return;
    const map = mapRef.current;

    try {
      if (map.getLayer("basemap-layer")) {
        map.removeLayer("basemap-layer");
      }
      if (map.getSource("basemap-source")) {
        map.removeSource("basemap-source");
      }

      map.addSource("basemap-source", {
        type: "raster",
        tiles: BASEMAP_TILES[style].tiles,
        tileSize: 256,
        attribution: BASEMAP_TILES[style].attribution,
        maxzoom: BASEMAP_TILES[style].maxzoom,
      });

      // Insert basemap at the very bottom
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

  // Update heatmap layer when data changes
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return;
    const map = mapRef.current;

    const currentData =
      activeLayer === "heatmap-after" && heatmapAfter
        ? heatmapAfter
        : heatmapBefore?.map_data;

    if (!currentData) return;

    const features = currentData.features as HeatmapTileFeature[];
    const temps = features.map((f) => f.properties.temperature);
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);

    const coloredGeoJSON = {
      type: "FeatureCollection",
      features: features.map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          color: tempToColor(f.properties.temperature, minTemp, maxTemp),
          opacity: basemap === "google-hybrid" ? 0.65 : 0.75,
        },
      })),
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
        "line-color": "rgba(255, 255, 255, 0.35)",
        "line-width": 0.8,
      },
    });

    // Tooltips
    map.on("mousemove", "heatmap-fill", (e: any) => {
      if (e.features && e.features.length > 0) {
        const props = e.features[0].properties;
        const tempC = props.temperature;
        setTooltip({
          x: e.point.x,
          y: e.point.y,
          tempC,
          tempF: parseFloat(((tempC * 9) / 5 + 32).toFixed(1)),
          coolingDelta: props.cooling_delta_f,
        });
      }
    });

    map.on("mouseleave", "heatmap-fill", () => setTooltip(null));
  }, [isMapLoaded, heatmapBefore, heatmapAfter, activeLayer, basemap]);

  // Render intervention markers
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return;
    const map = mapRef.current;

    if (!interventions.length) return;

    try {
      if (map.getLayer("interventions-pulse")) map.removeLayer("interventions-pulse");
      if (map.getLayer("interventions-layer")) map.removeLayer("interventions-layer");
      if (map.getSource("interventions-source")) map.removeSource("interventions-source");
    } catch {
      // Ignore
    }

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

    // Outer glow pulse
    map.addLayer({
      id: "interventions-pulse",
      type: "circle",
      source: "interventions-source",
      paint: {
        "circle-radius": 14,
        "circle-color": ["get", "color"],
        "circle-opacity": 0.25,
      },
    });

    // Solid inner marker
    map.addLayer({
      id: "interventions-layer",
      type: "circle",
      source: "interventions-source",
      paint: {
        "circle-radius": 7,
        "circle-color": ["get", "color"],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.95,
      },
    });
  }, [isMapLoaded, interventions]);

  const minTempC = heatmapBefore
    ? heatmapBefore.stats_data.temperature_stats.minimum
    : 30;
  const maxTempC = heatmapBefore
    ? heatmapBefore.stats_data.temperature_stats.maximum
    : 45;

  const fetchManualHeatmap = useCallback(async () => {
    setIsLoadingMap(true);
    try {
      const res = await fetch("/api/heatmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lon, radius_km: 2 }),
      });
      const json = await res.json();
      if (json.success) {
        useAppStore.getState().setHeatmapBefore(json.data);
      }
    } finally {
      setIsLoadingMap(false);
    }
  }, [lat, lon]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
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

      {/* Basemap Switcher (Google Satellite, Google Maps, Dark, Light) */}
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
          🗺️ Google Maps
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

      {/* Before / After Thermal Layer Toggle */}
      {heatmapBefore && (
        <div className="map-top-bar">
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

      {/* Manual fetch button when no data */}
      {!heatmapBefore && !isLoadingMap && (
        <div
          style={{
            position: "absolute",
            bottom: 80,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
          }}
        >
          <button className="btn-primary" onClick={fetchManualHeatmap} style={{ padding: "0.8rem 1.6rem" }}>
            🌡️ Run FortyGuard Thermal Audit
          </button>
        </div>
      )}

      {isLoadingMap && (
        <div
          style={{
            position: "absolute",
            bottom: 80,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: "0.65rem",
            background: "rgba(6, 21, 16, 0.95)",
            border: "1px solid var(--border-medium)",
            borderRadius: "var(--radius-full)",
            padding: "0.6rem 1.2rem",
            fontSize: "0.82rem",
            color: "var(--text-primary)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
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
          Querying FortyGuard Temperature API...
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
        {interventions.length > 0 && (
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

      {/* Hotspots Counter Pill */}
      {hotspots.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: 14,
            left: 14,
            background: "rgba(6, 21, 16, 0.9)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            borderRadius: "var(--radius-full)",
            padding: "0.35rem 0.8rem",
            fontSize: "0.75rem",
            color: "#fca5a5",
            zIndex: 10,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          🔥 <strong>{hotspots.filter((h) => h.priority === "critical").length}</strong> Critical Heat Corridors
        </div>
      )}
    </div>
  );
}
