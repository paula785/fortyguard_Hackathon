import { describe, it, expect } from "vitest";
import { generateIrrigationPlan, WATERING_WINDOWS } from "./water-calculator";
import type { InterventionPlacement } from "../fortyguard-types";

describe("Water Calculator & Irrigation Engine", () => {
  const mockPlacements: InterventionPlacement[] = [
    {
      id: "p-1",
      type: "tree",
      catalogItemId: "desert-willow",
      name: "Desert Willow",
      lat: 33.448,
      lon: -112.074,
      cost: 320,
      coolingDeltaF: 4.5,
      waterGalPerDay: 8,
      coverageM2: 45,
    },
    {
      id: "p-2",
      type: "shade_structure",
      catalogItemId: "tensile-sail-hyperbolic",
      name: "Hyperbolic Tensile Shade Sail",
      lat: 33.449,
      lon: -112.073,
      cost: 4500,
      coolingDeltaF: 12.0,
      waterGalPerDay: 0,
      coverageM2: 55,
    },
  ];

  it("should calculate daily and weekly gallons for trees and zero for structures", () => {
    const plan = generateIrrigationPlan(mockPlacements, null, false);
    expect(plan.plants).toHaveLength(1); // Only the tree needs watering
    expect(plan.totalDailyGallons).toBeGreaterThan(0);
    expect(plan.totalWeeklyGallons).toBe(parseFloat((plan.totalDailyGallons * 7).toFixed(1)));
    expect(plan.wateringWindows).toEqual(WATERING_WINDOWS);
  });

  it("should reduce water demand in drought mode", () => {
    const normalPlan = generateIrrigationPlan(mockPlacements, null, false);
    const droughtPlan = generateIrrigationPlan(mockPlacements, null, true);

    expect(droughtPlan.droughtMode).toBe(true);
    expect(droughtPlan.totalDailyGallons).toBeLessThan(normalPlan.totalDailyGallons);
  });

  it("should recommend pre-dawn window for high temperatures", () => {
    const plan = generateIrrigationPlan(mockPlacements, null, false);
    expect(plan.plants[0].optimalWindow.label).toContain("Pre-dawn");
  });
});
