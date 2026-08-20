// ─── Budget-Constrained Intervention Optimizer ────────────────────────────────
// Greedy knapsack: maximizes total cooling per dollar within budget

import { TREE_SPECIES, type TreeSpecies } from "./tree-species";
import { SHADE_STRUCTURES, type ShadeStructure } from "./shade-structures";
import type {
  Hotspot,
  InterventionPlacement,
  UserPreferences,
} from "../fortyguard-types";
import { v4 as uuidv4 } from "uuid";

interface CandidateItem {
  type: "tree" | "shade_structure";
  item: TreeSpecies | ShadeStructure;
  cost: number;
  coolingDeltaF: number;
  waterGalPerDay: number;
  coverageM2: number;
  score: number; // composite score based on mode
}

function sqFtToM2(sqFt: number): number {
  return sqFt * 0.0929;
}

function canopyM2(spreadFt: number): number {
  const r = (spreadFt / 2) * 0.3048; // ft → m
  return Math.PI * r * r;
}

function computeScore(
  candidate: Omit<CandidateItem, "score">,
  mode: UserPreferences["mode"]
): number {
  const coolingPerDollar = candidate.coolingDeltaF / candidate.cost;
  const coveragePerDollar = candidate.coverageM2 / candidate.cost;
  const waterEfficiency = 1 / (candidate.waterGalPerDay + 1);

  switch (mode) {
    case "low_water":
      return coolingPerDollar * 0.4 + waterEfficiency * 0.6;
    case "fast_shade":
      return coveragePerDollar * 0.5 + coolingPerDollar * 0.5;
    case "max_cooling":
      return coolingPerDollar * 0.9 + waterEfficiency * 0.1;
    case "balanced":
    default:
      return coolingPerDollar * 0.5 + coveragePerDollar * 0.3 + waterEfficiency * 0.2;
  }
}

function buildCandidates(preferences: UserPreferences): CandidateItem[] {
  const candidates: CandidateItem[] = [];

  // Tree candidates
  for (const tree of TREE_SPECIES) {
    const base: Omit<CandidateItem, "score"> = {
      type: "tree",
      item: tree,
      cost: tree.costPerUnit,
      coolingDeltaF: tree.coolingEffectDeltaF,
      waterGalPerDay: tree.waterGallonsPerDayBase,
      coverageM2: canopyM2(tree.matureCanopySpreadFt),
    };
    candidates.push({ ...base, score: computeScore(base, preferences.mode) });
  }

  // Shade structure candidates
  for (const structure of SHADE_STRUCTURES) {
    const base: Omit<CandidateItem, "score"> = {
      type: "shade_structure",
      item: structure,
      cost: structure.installCost,
      coolingDeltaF: structure.coolingEffectDeltaF,
      waterGalPerDay: 0, // structures need no water
      coverageM2: sqFtToM2(structure.coverageAreaSqFt),
    };
    candidates.push({ ...base, score: computeScore(base, preferences.mode) });
  }

  // Sort by score descending
  return candidates.sort((a, b) => b.score - a.score);
}

function offsetLatLon(
  lat: number,
  lon: number,
  index: number,
  surfaceType: string = "asphalt"
): { lat: number; lon: number } {
  // Corridor-aligned spatial placement (offsets along sidewalk/verge perimeter)
  const angle = (index * (Math.PI * 2)) / 6 + (surfaceType === "asphalt" ? 0.3 : 0);
  const distanceMeters = 18 + (index % 3) * 12; // 18m - 42m realistic corridor buffer
  
  const latOffset = (distanceMeters * Math.cos(angle)) / 111000;
  const lonOffset = (distanceMeters * Math.sin(angle)) / (111000 * Math.cos((lat * Math.PI) / 180));
  
  return {
    lat: parseFloat((lat + latOffset).toFixed(6)),
    lon: parseFloat((lon + lonOffset).toFixed(6)),
  };
}

export interface OptimizationResult {
  placements: InterventionPlacement[];
  totalCost: number;
  remainingBudget: number;
  totalCoolingDeltaF: number;
  totalWaterGalPerDay: number;
  totalCoverageM2: number;
  treeCount: number;
  structureCount: number;
}

export function optimizeInterventions(
  hotspots: Hotspot[],
  budgetCap: number,
  preferences: UserPreferences,
  maxItemsPerHotspot: number = 6
): OptimizationResult {
  const baseCandidates = buildCandidates(preferences);
  const placements: InterventionPlacement[] = [];
  let remainingBudget = budgetCap;

  // Process hotspots in priority order: critical → high → medium
  const sortedHotspots = [...hotspots].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2 };
    return order[a.priority] - order[b.priority];
  });

  for (const hotspot of sortedHotspots) {
    if (remainingBudget <= 0) break;

    // Land-cover aware filtering for this hotspot
    // If asphalt / plaza -> boost shade structures and high-reflectance sails
    // If sidewalk / verge -> boost deep-root shade trees
    const candidates = baseCandidates.filter((c) => {
      if (hotspot.surfaceType === "asphalt" && hotspot.tempC >= 40) {
        return c.type === "shade_structure" || (c.type === "tree" && c.coolingDeltaF >= 8);
      }
      if (hotspot.surfaceType === "sidewalk_verge") {
        return c.type === "tree" || c.item.id.includes("bus") || c.item.id.includes("pergola");
      }
      return true;
    });

    let itemsPlacedHere = 0;
    let localBudget = Math.min(remainingBudget, budgetCap * 0.35); // max 35% per hotspot cluster

    for (const candidate of candidates) {
      if (itemsPlacedHere >= maxItemsPerHotspot) break;
      if (candidate.cost > localBudget || candidate.cost > remainingBudget) continue;

      const { lat, lon } = offsetLatLon(hotspot.lat, hotspot.lon, itemsPlacedHere, hotspot.surfaceType);

      const catalogItem = candidate.item as TreeSpecies | ShadeStructure;

      const placement: InterventionPlacement = {
        id: uuidv4(),
        type: candidate.type,
        catalogItemId: catalogItem.id,
        name: catalogItem.name,
        lat,
        lon,
        cost: candidate.cost,
        coolingDeltaF: candidate.coolingDeltaF,
        waterGalPerDay: candidate.waterGalPerDay,
        coverageM2: candidate.coverageM2,
      };

      placements.push(placement);
      localBudget -= candidate.cost;
      remainingBudget -= candidate.cost;
      itemsPlacedHere++;
    }
  }

  const totalCost = budgetCap - remainingBudget;

  return {
    placements,
    totalCost,
    remainingBudget,
    totalCoolingDeltaF: placements.length > 0 
      ? parseFloat((placements.reduce((s, p) => s + p.coolingDeltaF, 0) / placements.length).toFixed(1))
      : 0,
    totalWaterGalPerDay: Math.round(placements.reduce((s, p) => s + p.waterGalPerDay, 0)),
    totalCoverageM2: Math.round(placements.reduce((s, p) => s + p.coverageM2, 0)),
    treeCount: placements.filter((p) => p.type === "tree").length,
    structureCount: placements.filter((p) => p.type === "shade_structure").length,
  };
}
