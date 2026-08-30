import { describe, it, expect } from "vitest";
import { optimizeInterventions } from "./optimizer";
import type { Hotspot, UserPreferences } from "../fortyguard-types";

describe("Intervention Optimizer Engine", () => {
  const mockHotspots: Hotspot[] = [
    {
      id: "hotspot-1",
      lat: 33.4484,
      lon: -112.074,
      tempC: 42.5,
      temperatureC: 42.5,
      tempF: 108.5,
      temperatureF: 108.5,
      surfaceType: "asphalt",
      priority: "critical",
      recommendedAction: "shade_structure",
      context: "Severe heat island",
    },
    {
      id: "hotspot-2",
      lat: 33.4495,
      lon: -112.073,
      tempC: 38.0,
      temperatureC: 38.0,
      tempF: 100.4,
      temperatureF: 100.4,
      surfaceType: "sidewalk_verge",
      priority: "high",
      recommendedAction: "tree_planting",
      context: "Pedestrian corridor",
    },
  ];

  it("should respect strict budget cap in balanced mode", () => {
    const budget = 50000;
    const preferences: UserPreferences = {
      mode: "balanced",
      aestheticStyle: "modern",
      prioritizeZones: ["transit", "park"],
    };

    const result = optimizeInterventions(mockHotspots, budget, preferences);
    expect(result.totalCost).toBeLessThanOrEqual(budget);
    expect(result.remainingBudget).toBeGreaterThanOrEqual(0);
    expect(result.placements.length).toBeGreaterThan(0);
    expect(result.treeCount + result.structureCount).toBe(result.placements.length);
  });

  it("should prioritize water-efficient species and structures in low_water mode", () => {
    const budget = 100000;
    const preferences: UserPreferences = {
      mode: "low_water",
      aestheticStyle: "modern",
      prioritizeZones: ["transit"],
    };

    const result = optimizeInterventions(mockHotspots, budget, preferences);
    expect(result.totalCost).toBeLessThanOrEqual(budget);
    expect(result.placements.length).toBeGreaterThan(0);
    expect(result.totalWaterGalPerDay).toBeDefined();
  });

  it("should return empty placements when budget is zero", () => {
    const preferences: UserPreferences = {
      mode: "balanced",
      aestheticStyle: "modern",
      prioritizeZones: [],
    };

    const result = optimizeInterventions(mockHotspots, 0, preferences);
    expect(result.placements).toHaveLength(0);
    expect(result.totalCost).toBe(0);
  });
});
