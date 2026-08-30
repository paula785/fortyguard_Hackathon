import { describe, it, expect } from "vitest";
import {
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  buildAOIFromCenter,
  getTodayDate,
} from "./fortyguard-client";

describe("FortyGuard Client Helpers", () => {
  it("should accurately convert Celsius and Fahrenheit", () => {
    expect(celsiusToFahrenheit(0)).toBe(32);
    expect(celsiusToFahrenheit(100)).toBe(212);
    expect(celsiusToFahrenheit(38)).toBe(100.4);

    expect(fahrenheitToCelsius(32)).toBe(0);
    expect(fahrenheitToCelsius(212)).toBe(100);
  });

  it("should build a valid 5-coordinate closed GeoJSON polygon AOI", () => {
    const aoi = buildAOIFromCenter(33.4484, -112.074, 3.0);
    expect(aoi.type).toBe("FeatureCollection");
    expect(aoi.features).toHaveLength(1);
    const coords = aoi.features[0].geometry.coordinates[0];
    expect(coords).toHaveLength(5);
    // Closed loop
    expect(coords[0]).toEqual(coords[4]);
  });

  it("should return valid YYYY-MM-DD date string", () => {
    const date = getTodayDate();
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
