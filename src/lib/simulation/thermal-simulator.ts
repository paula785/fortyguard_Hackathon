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

import { computeThermodynamicCooling } from "./eco-physics";

// ── Core Thermal Cooling Simulation ───────────────────────────────────────
export function simulateCooling(
  heatmapData: HeatmapResult | { type: "FeatureCollection"; features: HeatmapTileFeature[] } | { map_data: { features: HeatmapTileFeature[] } },
  placements: InterventionPlacement[]
): {
  beforeGeoJSON: any;
  afterGeoJSON: { type: "FeatureCollection"; features: HeatmapTileFeature[] };
  stats: TemperatureStats;
} {
  const originalFeatures: HeatmapTileFeature[] =
    (heatmapData as any)?.map_data?.features ||
    (heatmapData as any)?.features ||
    [];

  const afterFeatures: HeatmapTileFeature[] = originalFeatures.map((tile) => {
    const center = tileCenter(tile);
    const origTempC = getFeatureTemp(tile);
    let cumulativeCoolingDeltaF = 0;

    for (const p of placements || []) {
      const distM = haversineDistanceM(center.lat, center.lon, p.lat, p.lon);
      
      // Calculate thermodynamic physics for this specific intervention
      const thermo = computeThermodynamicCooling(p, origTempC);
      const effectiveRadiusM = thermo.effectiveCoolingRadiusM * 1.6;

      if (distM <= effectiveRadiusM) {
        // Gaussian thermal plume dispersion: e^(-(dist/radius)^2)
        const spatialDecay = Math.exp(-Math.pow(distM / effectiveRadiusM, 2));
        const directCoolingF = thermo.netCoolingDeltaF * spatialDecay;

        // Thermal boundary layer saturation model (diminishing return ceiling)
        cumulativeCoolingDeltaF += directCoolingF * Math.exp(-cumulativeCoolingDeltaF / 14);
      }
    }

    // Convert total cooling delta to Celsius
    const coolingDeltaC = (cumulativeCoolingDeltaF * 5) / 9;
    const newTempC = Math.max(origTempC - coolingDeltaC, 24.0);

    return {
      ...tile,
      properties: {
        ...tile.properties,
        temperature: parseFloat(newTempC.toFixed(2)),
        average_temperature: parseFloat(newTempC.toFixed(2)),
        cooling_delta_f: parseFloat(cumulativeCoolingDeltaF.toFixed(2)),
        original_temp_c: origTempC,
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
  heatmapData: HeatmapResult | { type: "FeatureCollection"; features: HeatmapTileFeature[] } | { map_data: { features: HeatmapTileFeature[] } },
  satelliteSegments: Record<string, number> = {},
  topN = 16
): import("../fortyguard-types").Hotspot[] {
  const features: HeatmapTileFeature[] =
    (heatmapData as any)?.map_data?.features ||
    (heatmapData as any)?.features ||
    [];

  const sorted = [...features].sort((a, b) => getFeatureTemp(b) - getFeatureTemp(a));

  return sorted.slice(0, topN).map((f, i) => {
    const coords = f.geometry.coordinates[0];
    const lats = coords.map((c) => c[1]);
    const lons = coords.map((c) => c[0]);
    const lat = lats.reduce((a, b) => a + b, 0) / lats.length;
    const lon = lons.reduce((a, b) => a + b, 0) / lons.length;
    const tempC = getFeatureTemp(f);
    const tempF = parseFloat(((tempC * 9) / 5 + 32).toFixed(1));

    // Dynamic land-cover classification from satellite context
    const isHighAsphalt = i < 6 || (satelliteSegments.road ?? 0.3) > 0.25;
    const surfaceType = isHighAsphalt ? "asphalt" : i % 3 === 0 ? "concrete_plaza" : "sidewalk_verge";

    const priority: "critical" | "high" | "medium" =
      tempC >= 39.5 || i < 4 ? "critical" : tempC >= 36.5 || i < 10 ? "high" : "medium";

    // Intelligent recommendation based on thermal severity & surface type
    let recommendedAction: "tree_planting" | "shade_structure" | "cool_roof" = "tree_planting";
    let contextDescription = "";

    if (tempC >= 41) {
      recommendedAction = "shade_structure";
      contextDescription = `Extreme Alert Heat Island: ${tempF}°F over unshaded ${surfaceType}. Immediate tensile shade canopy recommended for rapid relief.`;
    } else if (surfaceType === "asphalt" || surfaceType === "concrete_plaza") {
      recommendedAction = i % 2 === 0 ? "shade_structure" : "tree_planting";
      contextDescription = `High-albedo deficit corridor: ${tempF}°F surface temperature. Solar canopy or desert shade tree recommended.`;
    } else {
      recommendedAction = "tree_planting";
      contextDescription = `Pedestrian corridor: ${tempF}°F with permeable planting capacity. Deep-root native shade canopy recommended.`;
    }

    return {
      id: `hotspot-${i + 1}`,
      lat,
      lon,
      tempC,
      temperatureC: tempC,
      tempF,
      temperatureF: tempF,
      surfaceType,
      priority,
      recommendedAction,
      context: contextDescription,
    };
  });
}
