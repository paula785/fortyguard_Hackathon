// ─── Dynamic Water Budget Engine ──────────────────────────────────────────────

import type {
  InterventionPlacement,
  IrrigationPlan,
  IrrigationWindow,
  PlantIrrigationPlan,
  EnvParamsResult,
} from "../fortyguard-types";
import { getSpeciesById } from "../catalog/tree-species";

// ── Optimal watering windows ──────────────────────────────────────────────
export const WATERING_WINDOWS: IrrigationWindow[] = [
  { startHour: 4, endHour: 6, label: "Pre-dawn optimal (4–6 AM)" },
  { startHour: 20, endHour: 22, label: "Post-sunset (8–10 PM)" },
  { startHour: 6, endHour: 8, label: "Early morning (6–8 AM)" },
];

/**
 * Compute daily water need (gallons) for a single planted tree.
 *
 * Formula:
 *   Gallons = BaseRate × GrowthStage × TempMultiplier × SolarFactor × (1 – PrecipOffset) × DroughtFactor
 */
function calcDailyGallons(
  baseGallonsPerDay: number,
  plantAgeDays: number,
  avgTempF: number,
  cloudCoverOctas: number,    // 0-8
  precipMM: number,
  droughtMode: boolean
): number {
  // Growth stage factor: new plant needs more water
  const growthStageFactor = plantAgeDays < 365 ? 1.5 :
    plantAgeDays < 730 ? 1.2 : 1.0;

  // Temperature multiplier: higher temp → more water
  const tempMultiplier = avgTempF >= 110 ? 1.6 :
    avgTempF >= 100 ? 1.4 :
    avgTempF >= 90 ? 1.2 :
    avgTempF >= 80 ? 1.0 : 0.85;

  // Solar exposure factor: more cloud cover = less evaporation
  const solarFactor = 1 - (cloudCoverOctas / 8) * 0.3; // max 30% reduction

  // Precipitation offset: rain reduces irrigation need
  const precipOffset = Math.min(precipMM * 0.07, 0.6); // max 60% offset

  // Drought restriction factor
  const droughtFactor = droughtMode ? 0.72 : 1.0; // 28% reduction in drought mode

  const raw =
    baseGallonsPerDay *
    growthStageFactor *
    tempMultiplier *
    solarFactor *
    (1 - precipOffset) *
    droughtFactor;

  return parseFloat(Math.max(raw, baseGallonsPerDay * 0.3).toFixed(1));
}

/**
 * Calculate static irrigation (city timer-based) for comparison.
 * Assumes fixed schedule: base rate × 1.3 (over-watering is common)
 */
function staticIrrigationGallons(baseGallonsPerDay: number): number {
  return baseGallonsPerDay * 1.3 * 7; // weekly
}

/**
 * Pick the best watering window based on temperature conditions.
 * In extreme heat (>100°F), always recommend pre-dawn.
 */
function recommendWindow(avgTempF: number): IrrigationWindow {
  if (avgTempF >= 100) return WATERING_WINDOWS[0]; // Pre-dawn only
  if (avgTempF >= 85) return WATERING_WINDOWS[2];  // Early morning
  return WATERING_WINDOWS[1];                       // Post-sunset
}

export function generateIrrigationPlan(
  placements: InterventionPlacement[],
  envParams: EnvParamsResult | null,
  droughtMode: boolean = false,
  plantAgeDays: number = 30
): IrrigationPlan {
  // Extract environmental conditions
  const location = (envParams as any)?.result?.locations?.[0] || (envParams as any)?.data?.locations?.[0] || (envParams as any)?.locations?.[0];
  const heatIdxArr = location?.parameters?.heat_index_celsius;
  const precipArr = location?.parameters?.precipitation_mm;
  const cloudArr = location?.parameters?.cloud_cover_octas;

  const avgTempC = heatIdxArr
    ? heatIdxArr.filter(Boolean).reduce((a, b) => a + (b ?? 0), 0) /
      Math.max(heatIdxArr.filter(Boolean).length, 1)
    : 38; // default 100°F Phoenix

  const avgTempF = (avgTempC * 9) / 5 + 32;

  const avgPrecipMM = precipArr
    ? precipArr.filter(Boolean).reduce((a, b) => a + (b ?? 0), 0) /
      Math.max(precipArr.filter(Boolean).length, 1)
    : 0;

  const avgCloudOctas = cloudArr
    ? cloudArr.filter(Boolean).reduce((a, b) => a + (b ?? 0), 0) /
      Math.max(cloudArr.filter(Boolean).length, 1)
    : 2;

  const optimalWindow = recommendWindow(avgTempF);

  // Only trees need irrigation (shade structures need none)
  const treePlacements = placements.filter((p) => p.type === "tree");

  const plantPlans: PlantIrrigationPlan[] = treePlacements.map((p) => {
    const species = getSpeciesById(p.catalogItemId);
    const baseGallons = species?.waterGallonsPerDayBase ?? p.waterGalPerDay;

    const dailyGallons = calcDailyGallons(
      baseGallons,
      plantAgeDays,
      avgTempF,
      avgCloudOctas,
      avgPrecipMM,
      droughtMode
    );

    return {
      plantId: p.id,
      plantName: p.name,
      speciesName: species?.scientificName ?? "Unknown",
      dailyGallons,
      weeklyGallons: parseFloat((dailyGallons * 7).toFixed(1)),
      optimalWindow,
      droughtAdjustmentFactor: droughtMode ? 0.72 : 1.0,
    };
  });

  const totalDailyGallons = plantPlans.reduce((s, p) => s + p.dailyGallons, 0);
  const totalWeeklyGallons = parseFloat((totalDailyGallons * 7).toFixed(1));

  // Compare vs static city timer irrigation
  const staticWeekly = treePlacements.reduce((s, p) => {
    const species = getSpeciesById(p.catalogItemId);
    return s + staticIrrigationGallons(species?.waterGallonsPerDayBase ?? p.waterGalPerDay);
  }, 0);

  const savedVsStaticGallons = parseFloat((staticWeekly - totalWeeklyGallons).toFixed(0));

  return {
    totalDailyGallons: parseFloat(totalDailyGallons.toFixed(1)),
    totalWeeklyGallons,
    savedVsStaticGallons: Math.max(savedVsStaticGallons, 0),
    plants: plantPlans,
    droughtMode,
    wateringWindows: WATERING_WINDOWS,
  };
}

export const calculateIrrigation = generateIrrigationPlan;
