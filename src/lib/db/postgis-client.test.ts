import { describe, it, expect } from "vitest";
import { postgisClient } from "./postgis-client";
import { redisSimulationManager } from "../queue/redis-queue";

describe("Database & Queue Layer", () => {
  it("should create and fetch a job with postgisClient", async () => {
    const job = await postgisClient.createJob({
      projectName: "Test Phoenix Corridor",
      polygonAoi: {
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
      targetDate: "2026-08-30",
      granularity: 100,
    });

    expect(job.id).toBeDefined();
    expect(job.status).toBe("PROCESSING");

    const fetched = await postgisClient.getJob(job.id);
    expect(fetched).toBeDefined();
    expect(fetched?.project_name).toBe("Test Phoenix Corridor");
  });

  it("should generate discretized microgrid cells and cache in redis simulation manager", async () => {
    const grid = await postgisClient.generateMicrogrid("test-job-123", {
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
    }, 20);

    expect(grid.length).toBeGreaterThan(0);
    expect(grid[0].mcda_priority_score).toBeDefined();

    const matrix = await redisSimulationManager.cacheMarginalMatrix("test-job-123", grid);
    expect(matrix.jobId).toBe("test-job-123");
    expect(matrix.cumulativeDeltaT.length).toBe(matrix.totalPlantableCells);

    const simulation = await redisSimulationManager.evaluateSimulation({
      jobId: "test-job-123",
      treeCount: 15,
    });

    expect(simulation.cooling_metrics.average_temperature_reduction_celsius).toBeGreaterThan(0);
    expect(simulation.optimized_plant_locations.features.length).toBeGreaterThan(0);
  });
});
