import { describe, it, expect } from "vitest";
import {
  calculateWHORisk,
  generateDiurnalProfile,
  simulateCooling,
  detectHotspots,
} from "./thermal-simulator";
import type { HeatmapTileFeature, InterventionPlacement } from "../fortyguard-types";

describe("Thermal Simulator Engine", () => {
  describe("calculateWHORisk", () => {
    it("should classify temp >= 40C as Extreme Alert", () => {
      const risk = calculateWHORisk(41.5);
      expect(risk.level).toBe("Extreme Alert");
      expect(risk.color).toBe("#ef4444");
      expect(risk.zScore).toBeGreaterThan(2.0);
    });

    it("should classify temp between 35C and 40C as High risk", () => {
      const risk = calculateWHORisk(37.0);
      expect(risk.level).toBe("High");
      expect(risk.color).toBe("#f97316");
    });

    it("should classify temp between 30C and 35C as Moderate risk", () => {
      const risk = calculateWHORisk(32.0);
      expect(risk.level).toBe("Moderate");
      expect(risk.color).toBe("#f59e0b");
    });

    it("should classify temp < 30C as Normal microclimate", () => {
      const risk = calculateWHORisk(27.5);
      expect(risk.level).toBe("Normal");
      expect(risk.color).toBe("#10b981");
    });
  });

  describe("generateDiurnalProfile", () => {
    it("should generate 24 hourly simulation points with peak cooling in solar hours", () => {
      const profile = generateDiurnalProfile(38, 8.5);
      expect(profile).toHaveLength(24);
      expect(profile[0].hour).toBe("00:00");
      expect(profile[23].hour).toBe("23:00");

      // Afternoon peak (14:00 - 16:00) should have higher temperature
      const noon = profile[14];
      const midnight = profile[0];
      expect(noon.baselineF).toBeGreaterThan(midnight.baselineF);
      expect(noon.deltaF).toBeGreaterThan(midnight.deltaF);
      expect(noon.cooledF).toBe(parseFloat((noon.baselineF - noon.deltaF).toFixed(1)));
    });
  });

  describe("simulateCooling and treatedZoneAvgDeltaF", () => {
    const mockTile: HeatmapTileFeature = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-112.074, 33.448],
            [-112.073, 33.448],
            [-112.073, 33.449],
            [-112.074, 33.449],
            [-112.074, 33.448],
          ],
        ],
      },
      properties: {
        temperature: 42.0,
        average_temperature: 42.0,
      },
    };

    // Calculate exact centroid for mockTile
    const mockPlacement: InterventionPlacement = {
      id: "test-placement-1",
      type: "tree",
      catalogItemId: "desert-willow",
      name: "Desert Willow",
      lat: 33.4484, // matches center of mockTile polygon vertices
      lon: -112.0736,
      cost: 320,
      coolingDeltaF: 8.5,
      waterGalPerDay: 8,
      coverageM2: 50,
    };

    it("should compute thermodynamic cooling and populate treatedZoneAvgDeltaF correctly", () => {
      const heatmap = {
        type: "FeatureCollection" as const,
        features: [mockTile],
      };

      const result = simulateCooling(heatmap, [mockPlacement]);
      expect(result.afterGeoJSON.features).toHaveLength(1);
      expect(result.stats).toBeDefined();
      expect(result.stats.treatedZoneAvgDeltaF).toBeGreaterThan(0);
      expect(result.stats.maxDeltaF).toBeGreaterThan(0);
      expect(result.stats.beforeAvgF).toBeGreaterThan(result.stats.afterAvgF);
    });
  });

  describe("detectHotspots", () => {
    it("should detect top priority unshaded corridors from heatmap features", () => {
      const mockFeatures: HeatmapTileFeature[] = Array.from({ length: 5 }).map((_, i) => ({
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-112.074 + i * 0.001, 33.448],
              [-112.073 + i * 0.001, 33.448],
              [-112.073 + i * 0.001, 33.449],
              [-112.074 + i * 0.001, 33.449],
              [-112.074 + i * 0.001, 33.448],
            ],
          ],
        },
        properties: {
          temperature: 38 + i * 1.5,
          average_temperature: 38 + i * 1.5,
        },
      }));

      const hotspots = detectHotspots({ type: "FeatureCollection", features: mockFeatures }, {}, 3);
      expect(hotspots).toHaveLength(3);
      // Highest temperature tile should be first
      expect(hotspots[0].tempC).toBe(44.0);
      expect(hotspots[0].priority).toBe("critical");
    });
  });
});
