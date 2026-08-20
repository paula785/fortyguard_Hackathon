// ─── Thermal Simulation Engine ────────────────────────────────────────────────
// Computes before/after temperature projections, WHO heat-risk bands & diurnal profiles

import {
  type HeatmapResult,
  type HeatmapTileFeature,
  type InterventionPlacement,
  type TemperatureStats,
  getFeatureTemp,
} from "../fortyguard-types";
import { celsiusToFahrenheit } from "../fortyguard-client";

// ── WHO Heat Risk Classification ──────────────────────────────────────────
export interface WHORiskBand {
  level: "Normal" | "Moderate" | "High" | "Extreme Alert";
  color: string;
  badgeClass: string;
  advisory: string;
  zScore: number;
}

export function calculateWHORisk(tempC: number, meanBaselineC = 34, stdDev = 3.5): WHORiskBand {
  const zScore = parseFloat(((tempC - meanBaselineC) / stdDev).toFixed(2));

  if (tempC >= 40 || zScore >= 2.0) {
    return {
      level: "Extreme Alert",
      color: "#ef4444",
      badgeClass: "pill-extreme",
      advisory: "Severe heatstroke risk for general population. Immediate shade & cooling required.",
      zScore,
    };
  }
  if (tempC >= 35 || zScore >= 1.0) {
    return {
      level: "High",
      color: "#f97316",
      badgeClass: "pill-high",
      advisory: "Dangerous heat stress for outdoor workers, transit commuters & vulnerable populations.",
      zScore,
    };
  }
  if (tempC >= 30 || zScore >= 0.0) {
    return {
      level: "Moderate",
      color: "#f59e0b",
      badgeClass: "pill-moderate",
      advisory: "Elevated discomfort in unshaded asphalt corridors. Heat mitigation recommended.",
      zScore,
    };
  }
  return {
    level: "Normal",
    color: "#10b981",
    badgeClass: "pill-low",
    advisory: "Acceptable microclimate thermal threshold.",
    zScore,
  };
}

// ── 24-Hour Diurnal Temperature Profile Simulation ────────────────────────
export interface DiurnalPoint {
  hour: string;
  baselineF: number;
  cooledF: number;
  deltaF: number;
}

export function generateDiurnalProfile(avgTempC: number, avgDeltaF: number): DiurnalPoint[] {
  const points: DiurnalPoint[] = [];
  const baseF = (avgTempC * 9) / 5 + 32;

  // Typical diurnal temperature curve factors (peak at 15:00)
  const hourFactors = [
    -6.5, -7.2, -7.8, -8.2, -8.5, -7.9, // 00:00 - 05:00 (Night/Pre-dawn)
    -6.2, -3.5, 0.0, 3.8, 6.5, 8.2,     // 06:00 - 11:00 (Morning)
    9.5, 10.8, 11.5, 11.2, 9.8, 7.5,    // 12:00 - 17:00 (Afternoon peak)
    5.0, 2.5, 0.2, -2.0, -4.0, -5.5     // 18:00 - 23:00 (Evening)
  ];

  for (let h = 0; h < 24; h++) {
    const baselineF = parseFloat((baseF + hourFactors[h]).toFixed(1));
    // Cooling is highest during sunny peak hours (10:00 - 18:00)
    const solarFactor = Math.max(0.2, Math.sin((h / 24) * Math.PI) * 1.3);
    const deltaF = parseFloat((avgDeltaF * solarFactor).toFixed(1));
    const cooledF = parseFloat((baselineF - deltaF).toFixed(1));

    points.push({
      hour: `${h.toString().padStart(2, "0")}:00`,
      baselineF,
      cooledF,
      deltaF,
    });
  }

  return points;
}

// ── Geometry helpers ──────────────────────────────────────────────────────
function haversineDistanceM(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function tileCenter(feature: HeatmapTileFeature): { lat: number; lon: number } {
  const coords = feature.geometry.coordinates[0];
  const lats = coords.map((c) => c[1]);
  const lons = coords.map((c) => c[0]);
  return {
    lat: lats.reduce((a, b) => a + b) / lats.length,
    lon: lons.reduce((a, b) => a + b) / lons.length,
  };
}

function coverageRadius(p: InterventionPlacement): number {
  return Math.sqrt(p.coverageM2 / Math.PI);
}

// ── Core Thermal Cooling Simulation ───────────────────────────────────────
export function simulateCooling(
  heatmapData: { type: "FeatureCollection"; features: HeatmapTileFeature[] },
  placements: InterventionPlacement[]
): {
  beforeGeoJSON: { type: "FeatureCollection"; features: HeatmapTileFeature[] };
  afterGeoJSON: { type: "FeatureCollection"; features: HeatmapTileFeature[] };
  stats: TemperatureStats;
} {
  const originalFeatures = heatmapData.features;

  const afterFeatures: HeatmapTileFeature[] = originalFeatures.map((tile) => {
    const center = tileCenter(tile);
    let totalCoolingDeltaF = 0;

    for (const p of placements) {
      const distM = haversineDistanceM(center.lat, center.lon, p.lat, p.lon);
      const radiusM = coverageRadius(p) * 2.5;

      if (distM <= radiusM) {
        const proximityFactor = 1 - distM / radiusM;
        const incrementalCooling = p.coolingDeltaF * proximityFactor;
        // Diminishing returns model: 1 - e^(-total / k)
        totalCoolingDeltaF =
          totalCoolingDeltaF +
          incrementalCooling * Math.exp(-totalCoolingDeltaF / 10);
      }
    }

    const coolingDeltaC = (totalCoolingDeltaF * 5) / 9;
    const newTempC = Math.max(
      tile.properties.temperature - coolingDeltaC,
      tile.properties.temperature * 0.75
    );

    return {
      ...tile,
      properties: {
        ...tile.properties,
        temperature: parseFloat(newTempC.toFixed(2)),
        cooling_delta_f: parseFloat(totalCoolingDeltaF.toFixed(2)),
        original_temp_c: tile.properties.temperature,
      },
    };
  });

  const beforeTempsC = originalFeatures.map((f) => getFeatureTemp(f));
  const afterTempsC = afterFeatures.map((f) => getFeatureTemp(f));

  const beforeTempsF = beforeTempsC.map(celsiusToFahrenheit);
  const afterTempsF = afterTempsC.map(celsiusToFahrenheit);

  const deltasF = beforeTempsF.map((b, i) => b - afterTempsF[i]);
  const avgDeltaF = deltasF.reduce((a, b) => a + b, 0) / (deltasF.length || 1);
  const maxDeltaF = Math.max(...deltasF, 0);

  const improvedCount = deltasF.filter((d) => d > 0.5).length;
  const areaImprovedPercent = (improvedCount / (deltasF.length || 1)) * 100;

  const stats: TemperatureStats = {
    beforeAvgF: parseFloat(
      (beforeTempsF.reduce((a, b) => a + b, 0) / (beforeTempsF.length || 1)).toFixed(1)
    ),
    afterAvgF: parseFloat(
      (afterTempsF.reduce((a, b) => a + b, 0) / (afterTempsF.length || 1)).toFixed(1)
    ),
    avgDeltaF: parseFloat(avgDeltaF.toFixed(1)),
    maxDeltaF: parseFloat(maxDeltaF.toFixed(1)),
    areaImprovedPercent: parseFloat(areaImprovedPercent.toFixed(1)),
  };

  return {
    beforeGeoJSON: heatmapData,
    afterGeoJSON: {
      type: "FeatureCollection",
      features: afterFeatures,
    },
    stats,
  };
}

export function detectHotspots(
  heatmapData: HeatmapResult | { type: "FeatureCollection"; features: HeatmapTileFeature[] },
  satelliteSegments: Record<string, number> = {},
  topN = 15
): import("../fortyguard-types").Hotspot[] {
  const features =
    "map_data" in heatmapData
      ? heatmapData.map_data.features
      : heatmapData.features;

  const sorted = [...features].sort((a, b) => getFeatureTemp(b) - getFeatureTemp(a));

  return sorted.slice(0, topN).map((f, i) => {
    const coords = f.geometry.coordinates[0];
    const lats = coords.map((c) => c[1]);
    const lons = coords.map((c) => c[0]);
    const lat = lats.reduce((a, b) => a + b, 0) / lats.length;
    const lon = lons.reduce((a, b) => a + b, 0) / lons.length;
    const tempC = getFeatureTemp(f);
    const tempF = parseFloat(((tempC * 9) / 5 + 32).toFixed(1));

    const priority: "critical" | "high" | "medium" =
      i < 5 || tempC >= 38 ? "critical" : i < 10 ? "high" : "medium";

    return {
      id: `hotspot-${i + 1}`,
      lat,
      lon,
      tempC,
      tempF,
      surfaceType: f.properties.surface_type || "asphalt",
      priority,
      recommendedAction: i % 2 === 0 ? "tree_planting" : "shade_structure",
      context: `Tile ${f.properties.tile_id ?? i}: ${tempF}°F (${tempC.toFixed(1)}°C) unshaded corridor`,
    };
  });
}
