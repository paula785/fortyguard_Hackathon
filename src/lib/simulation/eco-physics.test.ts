import { describe, it, expect } from "vitest";
import { computeThermodynamicCooling, calculateEcoBenefits } from "./eco-physics";
import type { InterventionPlacement } from "../fortyguard-types";

describe("Eco Physics & USDA i-Tree Engine", () => {
  const treePlacement: InterventionPlacement = {
    id: "tree-1",
    type: "tree",
    catalogItemId: "desert-willow",
    name: "Desert Willow",
    lat: 33.448,
    lon: -112.074,
    cost: 320,
    coolingDeltaF: 4.5,
    waterGalPerDay: 8,
    coverageM2: 45,
  };

  const shadePlacement: InterventionPlacement = {
    id: "shade-1",
    type: "shade_structure",
    catalogItemId: "tensile-sail-hyperbolic",
    name: "Tensile Sail",
    lat: 33.4485,
    lon: -112.0735,
    cost: 4500,
    coolingDeltaF: 12.0,
    waterGalPerDay: 0,
    coverageM2: 55,
  };

  it("should compute thermodynamic cooling with sensible + latent heat fluxes", () => {
    const thermoTree = computeThermodynamicCooling(treePlacement, 40.0);
    expect(thermoTree.netCoolingDeltaF).toBeGreaterThan(0);
    expect(thermoTree.effectiveCoolingRadiusM).toBeGreaterThan(0);
    expect(thermoTree.solarInterceptionWattsM2).toBeGreaterThan(0);
    expect(thermoTree.evapotranspirationalFluxWattsM2).toBeGreaterThan(0);

    const thermoShade = computeThermodynamicCooling(shadePlacement, 40.0);
    expect(thermoShade.netCoolingDeltaF).toBeGreaterThan(0);
    expect(thermoShade.albedoCoolingDeltaF).toBeGreaterThan(0);
    // Shade structure has 0 latent evapotranspiration cooling
    expect(thermoShade.evapotranspirationalFluxWattsM2).toBe(0);
  });

  it("should compute 20-year USDA i-Tree eco-benefits and positive ROI ratio", () => {
    const eco = calculateEcoBenefits([treePlacement, shadePlacement]);
    expect(eco.annualCarbonKg).toBeGreaterThan(0);
    expect(eco.annualStormwaterGallons).toBeGreaterThan(0);
    expect(eco.annualEnergySavingsKwh).toBeGreaterThan(0);
    expect(eco.annualEnergySavingsUsd).toBeGreaterThan(0);
    expect(eco.twentyYearCarbonTons).toBeGreaterThan(0);
    expect(eco.twentyYearNetRoiRatio).toBeGreaterThanOrEqual(1.25);
  });
});
