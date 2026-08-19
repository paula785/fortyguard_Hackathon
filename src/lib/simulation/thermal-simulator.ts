// ─── Thermal Simulation Engine ────────────────────────────────────────────────
// Computes before/after temperature projections based on intervention placements

import type {
  HeatmapResult,
  HeatmapTileFeature,
  InterventionPlacement,
  TemperatureStats,
} from "../fortyguard-types";
import { celsiusToFahrenheit } from "../fortyguard-client";
import { getSpeciesById } from "../catalog/tree-species";
import { getStructureById } from "../catalog/shade-structures";
import { v4 as uuidv4 } from "uuid";

// ── Geometry helpers ──────────────────────────────────────────────────────
function haversineDistanceM(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000; // Earth radius in meters
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
  // Convert coverage area (m²) to equivalent circular radius
  return Math.sqrt(p.coverageM2 / Math.PI);
}

// ── Core simulation ───────────────────────────────────────────────────────

/**
 * For each heatmap tile, compute the cumulative cooling from nearby interventions.
 * Uses an inverse-distance weighted overlap model with diminishing returns.
 */
export function simulateCooling(
  heatmapResult: HeatmapResult,
  placements: InterventionPlacement[]
): {
  beforeGeoJSON: { type: "FeatureCollection"; features: HeatmapTileFeature[] };
  afterGeoJSON: { type: "FeatureCollection"; features: HeatmapTileFeature[] };
  stats: TemperatureStats;
} {
  const originalFeatures = heatmapResult.map_data.features;

  const afterFeatures: HeatmapTileFeature[] = originalFeatures.map((tile) => {
    const center = tileCenter(tile);
    const originalTempC = tile.properties.temperature;
    const originalTempF = celsiusToFahrenheit(originalTempC);

    // Accumulate cooling from all nearby interventions
    let totalCoolingF = 0;
    const overlappingPlacementIds = new Set<string>();

    for (const p of placements) {
      const distM = haversineDistanceM(center.lat, center.lon, p.lat, p.lon);
      const radius = coverageRadius(p);

      if (distM <= radius) {
        // Full effect within coverage radius
        const shadeDensity = getShadeDensity(p);
        const cooling = p.coolingDeltaF * shadeDensity;
        totalCoolingF += cooling;
        overlappingPlacementIds.add(p.id);
      } else if (distM <= radius * 2.5) {
        // Partial effect in surrounding zone (radiant + convective)
        const falloff = 1 - (distM - radius) / (radius * 1.5);
        const shadeDensity = getShadeDensity(p);
        const cooling = p.coolingDeltaF * shadeDensity * falloff * 0.4;
        totalCoolingF += cooling;
      }
    }

    // Diminishing returns when multiple items overlap
    const count = overlappingPlacementIds.size;
    const diminishingFactor = count > 1 ? 1 + Math.log(count) * 0.4 : 1;
    const adjustedCoolingF = totalCoolingF / Math.max(diminishingFactor, 1);

    const afterTempF = Math.max(originalTempF - adjustedCoolingF, originalTempF * 0.7);
    const afterTempC = ((afterTempF - 32) * 5) / 9;

    return {
      ...tile,
      properties: {
        ...tile.properties,
        temperature: parseFloat(afterTempC.toFixed(2)),
        temperature_before: originalTempC,
        cooling_delta_f: parseFloat(adjustedCoolingF.toFixed(2)),
      },
    };
  });

  // Compute summary stats
  const beforeTempsF = originalFeatures.map((f) =>
    celsiusToFahrenheit(f.properties.temperature)
  );
  const afterTempsF = afterFeatures.map((f) =>
    celsiusToFahrenheit(f.properties.temperature)
  );

  const avgBeforeF = avg(beforeTempsF);
  const avgAfterF = avg(afterTempsF);
  const avgDeltaF = avgBeforeF - avgAfterF;
  const maxDeltaF = Math.max(
    ...afterFeatures.map((f) => (f.properties as Record<string, number>).cooling_delta_f ?? 0)
  );
  const improvedCount = afterFeatures.filter(
    (f) => ((f.properties as Record<string, number>).cooling_delta_f ?? 0) > 0
  ).length;
  const areaImprovedPercent = (improvedCount / originalFeatures.length) * 100;

  return {
    beforeGeoJSON: heatmapResult.map_data,
    afterGeoJSON: {
      type: "FeatureCollection",
      features: afterFeatures,
    },
    stats: {
      avgBeforeF: parseFloat(avgBeforeF.toFixed(1)),
      avgAfterF: parseFloat(avgAfterF.toFixed(1)),
      avgDeltaF: parseFloat(avgDeltaF.toFixed(1)),
      maxDeltaF: parseFloat(maxDeltaF.toFixed(1)),
      areaImprovedPercent: parseFloat(areaImprovedPercent.toFixed(1)),
    },
  };
}

function getShadeDensity(p: InterventionPlacement): number {
  if (p.type === "tree") {
    const species = getSpeciesById(p.catalogItemId);
    return species?.shadeDensity ?? 0.7;
  } else {
    const structure = getStructureById(p.catalogItemId);
    return structure ? structure.solarBlockingPercent / 100 : 0.9;
  }
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// ── Hotspot Detection ─────────────────────────────────────────────────────────

/**
 * Identify top heat hotspots from heatmap + satellite segmentation data.
 * Prioritizes tiles with high temperature AND low shade (asphalt, concrete).
 */
export function detectHotspots(
  heatmapResult: HeatmapResult,
  satelliteSegments?: Record<string, number>, // class coverage %
  topN: number = 20
): import("../fortyguard-types").Hotspot[] {
  const features = heatmapResult.map_data.features;
  const maxTemp = heatmapResult.map_data.features.reduce(
    (m, f) => Math.max(m, f.properties.temperature), -Infinity
  );
  const minTemp = features.reduce(
    (m, f) => Math.min(m, f.properties.temperature), Infinity
  );
  const tempRange = maxTemp - minTemp || 1;

  const scored = features.map((tile) => {
    const center = tileCenter(tile);
    const tempC = tile.properties.temperature;
    const tempF = celsiusToFahrenheit(tempC);
    const normalizedTemp = (tempC - minTemp) / tempRange;

    // Estimate shade from satellite segments (asphalt/concrete = low shade)
    const asphaltPct = (satelliteSegments?.["asphalt"] ?? 0) +
      (satelliteSegments?.["road"] ?? 0) +
      (satelliteSegments?.["pavement"] ?? 0);
    const vegetationPct = satelliteSegments?.["vegetation"] ?? 0;
    const shadePercent = vegetationPct;

    // Priority scoring: high temp + low shade = critical
    const score = normalizedTemp * 0.7 + (1 - shadePercent / 100) * 0.3;

    const priority: "critical" | "high" | "medium" =
      score > 0.75 ? "critical" : score > 0.5 ? "high" : "medium";

    // Estimate tile area in m²
    const coords = tile.geometry.coordinates[0];
    const latDiff = Math.abs(coords[0][1] - coords[2][1]);
    const lonDiff = Math.abs(coords[0][0] - coords[2][0]);
    const areaM2 = latDiff * 111000 * lonDiff * 111000 * Math.cos((center.lat * Math.PI) / 180);

    return {
      id: uuidv4(),
      lat: center.lat,
      lon: center.lon,
      temperature: tempC,
      temperatureF: parseFloat(tempF.toFixed(1)),
      surfaceType: asphaltPct > 50 ? "asphalt" : vegetationPct > 30 ? "vegetation" : "mixed",
      priority,
      areaM2: parseFloat(areaM2.toFixed(0)),
      shadePercent: parseFloat(shadePercent.toFixed(1)),
      coordinates: tile.geometry.coordinates,
      score,
    };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(({ score: _score, ...rest }) => rest);
}
