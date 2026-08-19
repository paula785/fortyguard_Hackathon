"use client";
// ─── Interactive MapLibre Heatmap ─────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from "react";
import { useAppStore } from "@/store/app-store";
import type { HeatmapTileFeature } from "@/lib/fortyguard-types";


// Temperature → color mapping
function tempToColor(tempC: number, min: number, max: number): string {
  const t = Math.max(0, Math.min(1, (tempC - min) / Math.max(max - min, 1)));
  if (t < 0.25) return `hsl(${200 + t * 60}, 70%, 50%)`;   // blue-cyan (cool)
  if (t < 0.5) return `hsl(${60 - t * 60}, 80%, 55%)`;     // green-yellow (warm)
  if (t < 0.75) return `hsl(${30 - t * 40}, 90%, 50%)`;    // orange (hot)
  return `hsl(${10 - t * 10}, 95%, 45%)`;                   // red (extreme)
}

interface TooltipInfo {
  x: number;
  y: number;
  tempC: number;
  tempF: number;
  coolingDelta?: number;
}

export default function HeatMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isLoadingMap, setIsLoadingMap] = useState(false);

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
    setBudget,
  } = useAppStore();

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const initMap = async () => {
      try {
        const mlModule = await import("maplibre-gl");
        const MapClass = mlModule.Map || (mlModule as any).default?.Map || (mlModule as any).default;
        const NavControl = mlModule.NavigationControl || (mlModule as any).default?.NavigationControl;

        if (!MapClass) {
          throw new Error("MapLibre Map constructor not found in module exports");
        }

        const map = new MapClass({
          container: mapContainer.current!,
          style: {
            version: 8,
            sources: {
              "carto-dark": {
                type: "raster",
                tiles: [
                  "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
                  "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
                ],
                tileSize: 256,
                attribution: "© OpenStreetMap © CARTO",
              },
            },
            layers: [
              {
                id: "background",
                type: "raster",
                source: "carto-dark",
              },
            ],
          },
          center: [lon, lat],
          zoom: 13,
        });

        if (NavControl) {
          map.addControl(new NavControl(), "bottom-left");
        }

        map.on("load", () => {
          setIsMapLoaded(true);
          mapRef.current = map;
        });

        map.on("error", (e: unknown) => {
          console.error("Map error:", e);
        });
      } catch (err: unknown) {
        console.error("Failed to initialize map:", err);
        setMapError((err as Error).message);
      }
    };

    initMap();

    return () => {
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update heatmap layer when data changes
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return;

    const map = mapRef.current as {
      getSource: (id: string) => unknown;
      addSource: (id: string, source: unknown) => void;
      addLayer: (layer: unknown) => void;
      removeLayer: (id: string) => void;
      removeSource: (id: string) => void;
      on: (event: string, id: string, handler: (e: unknown) => void) => void;
      getCanvas: () => { style: { cursor: string } };
    };

    const currentData = activeLayer === "heatmap-after" && heatmapAfter
      ? heatmapAfter
      : heatmapBefore?.map_data;

    if (!currentData) return;

    const features = currentData.features as HeatmapTileFeature[];
    const temps = features.map(f => f.properties.temperature);
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);

    // Build GeoJSON with colors
    const coloredGeoJSON = {
      type: "FeatureCollection",
      features: features.map(f => ({
        ...f,
        properties: {
          ...f.properties,
          color: tempToColor(f.properties.temperature, minTemp, maxTemp),
          opacity: 0.72,
        },
      })),
    };

    // Remove existing layers
    try {
      map.removeLayer("heatmap-fill");
      map.removeLayer("heatmap-outline");
      map.removeSource("heatmap-source");
    } catch { /* layers don't exist yet */ }

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
        "line-color": "rgba(0,0,0,0.2)",
        "line-width": 0.5,
      },
    });

    // Hover tooltip
    map.on("mousemove", "heatmap-fill", (e: unknown) => {
      const event = e as { point: { x: number; y: number }; features?: Array<{ properties: Record<string, number> }> };
      if (event.features && event.features.length > 0) {
        const props = event.features[0].properties;
        const tempC = props.temperature;
        setTooltip({
          x: event.point.x,
          y: event.point.y,
          tempC,
          tempF: parseFloat(((tempC * 9/5) + 32).toFixed(1)),
          coolingDelta: props.cooling_delta_f,
        });
      }
    });

    map.on("mouseleave", "heatmap-fill", () => setTooltip(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMapLoaded, heatmapBefore, heatmapAfter, activeLayer]);

  // Render intervention markers
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return;

    const map = mapRef.current as {
      addSource: (id: string, s: unknown) => void;
      addLayer: (l: unknown) => void;
      removeLayer: (id: string) => void;
      removeSource: (id: string) => void;
      getSource: (id: string) => unknown;
    };

    if (!interventions.length) return;

    try { map.removeLayer("interventions-layer"); map.removeSource("interventions-source"); } catch { /* ok */ }

    const geojson = {
      type: "FeatureCollection",
      features: interventions.map(p => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lon, p.lat] },
        properties: {
          type: p.type,
          name: p.name,
          cooling: p.coolingDeltaF,
          cost: p.cost,
          color: p.type === "tree" ? "#27ae60" : "#1769b0",
        },
      })),
    };

    map.addSource("interventions-source", { type: "geojson", data: geojson });
    map.addLayer({
      id: "interventions-layer",
      type: "circle",
      source: "interventions-source",
      paint: {
        "circle-radius": 7,
        "circle-color": ["get", "color"],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#fff",
        "circle-opacity": 0.9,
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
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "var(--bg-primary)", gap: "1rem",
        }}>
          <div style={{ fontSize: "2rem" }}>🗺️</div>
          <p style={{ color: "var(--text-secondary)", textAlign: "center", maxWidth: 300 }}>
            Map failed to load: {mapError}
          </p>
        </div>
      )}

      {/* Before/After toggle */}
      {heatmapBefore && (
        <div className="map-before-after">
          <button
            className={`toggle-btn ${activeLayer === "heatmap-before" ? "active" : ""}`}
            onClick={() => setActiveLayer("heatmap-before")}
          >
            Before
          </button>
          <button
            className={`toggle-btn ${activeLayer === "heatmap-after" ? "active" : ""}`}
            onClick={() => setActiveLayer("heatmap-after")}
            disabled={!heatmapAfter}
          >
            After
          </button>
        </div>
      )}

      {/* Manual fetch button when no data */}
      {!heatmapBefore && !isLoadingMap && (
        <div style={{
          position: "absolute",
          bottom: 80,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
        }}>
          <button
            className="btn btn-primary"
            onClick={fetchManualHeatmap}
          >
            🌡️ Load Heatmap
          </button>
        </div>
      )}

      {isLoadingMap && (
        <div style={{
          position: "absolute",
          bottom: 80,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "0.5rem 1rem",
          fontSize: "0.8rem",
          color: "var(--text-secondary)",
        }}>
          <div className="spinner" />
          Fetching temperature data...
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: "absolute",
          left: tooltip.x + 12,
          top: tooltip.y - 40,
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-medium)",
          borderRadius: "var(--radius-sm)",
          padding: "0.4rem 0.7rem",
          fontSize: "0.75rem",
          color: "var(--text-primary)",
          pointerEvents: "none",
          zIndex: 20,
          whiteSpace: "nowrap",
        }}>
          <strong>{tooltip.tempF}°F</strong> ({tooltip.tempC.toFixed(1)}°C)
          {tooltip.coolingDelta && tooltip.coolingDelta > 0 && (
            <span style={{ color: "#4ade80", marginLeft: 6 }}>
              −{tooltip.coolingDelta.toFixed(1)}°F after
            </span>
          )}
        </div>
      )}

      {/* Temperature legend */}
      <div className="map-legend">
        <div className="legend-title">Temperature</div>
        <div className="legend-scale" />
        <div className="legend-labels">
          <span>{((minTempC * 9/5) + 32).toFixed(0)}°F</span>
          <span>{((maxTempC * 9/5) + 32).toFixed(0)}°F</span>
        </div>
        {interventions.length > 0 && (
          <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <div className="legend-title">Interventions</div>
            <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.7rem", color: "var(--text-muted)" }}>
              <span>🟢 Trees ({interventions.filter(i=>i.type==="tree").length})</span>
              <span>🔵 Structures ({interventions.filter(i=>i.type==="shade_structure").length})</span>
            </div>
          </div>
        )}
      </div>

      {/* Hotspot count badge */}
      {hotspots.length > 0 && (
        <div style={{
          position: "absolute",
          top: 12,
          right: 12,
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-medium)",
          borderRadius: "var(--radius-md)",
          padding: "0.4rem 0.75rem",
          fontSize: "0.75rem",
          zIndex: 10,
        }}>
          🔥 <strong>{hotspots.filter(h => h.priority === "critical").length}</strong> critical hotspots
        </div>
      )}
    </div>
  );
}
