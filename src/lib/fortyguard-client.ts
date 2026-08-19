// ─── FortyGuard API Client ─────────────────────────────────────────────────────
// Server-side only. API key is never exposed to the browser.

import type {
  HeatmapRequest, HeatmapResult,
  SatelliteRequest, SatelliteResult,
  StreetViewRequest, StreetViewResult,
  HeatIntelRequest, HeatIntelResult,
  EnvParamsRequest, EnvParamsResult,
  StatusResponse, ActivityResponse,
} from "./fortyguard-types";

const BASE_URL = process.env.FORTYGUARD_BASE_URL || "https://api.fortyguard.com/v1";
const API_KEY  = process.env.FORTYGUARD_API_KEY || "e983b506118ca77b1a9a6af814000d05";

// ── Polling config ─────────────────────────────────────────────────────────
const POLL_INITIAL_MS  = 3000;
const POLL_MAX_MS      = 15000;
const POLL_BACKOFF     = 1.5;
const POLL_TIMEOUT_MS  = 180_000;

// ── Helpers ────────────────────────────────────────────────────────────────
function headers(): Record<string, string> {
  return {
    "api-key": API_KEY,
    "Content-Type": "application/json",
  };
}

async function postActivity<T>(path: string, body: T): Promise<string> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FortyGuard POST ${path} failed [${res.status}]: ${text}`);
  }

  const json = (await res.json()) as {
    activity_id?: string;
    message?: string;
    data?: { activity_id?: string };
  };

  const activityId = json.data?.activity_id || json.activity_id;

  if (!activityId) {
    throw new Error(`FortyGuard POST ${path}: no activity_id returned. ${json.message ?? ""}`);
  }

  return activityId;
}

async function pollActivity<R>(activityId: string): Promise<R> {
  const url      = `${BASE_URL}/status/${activityId}`;
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let   interval = POLL_INITIAL_MS;

  while (Date.now() < deadline) {
    await sleep(interval);
    interval = Math.min(interval * POLL_BACKOFF, POLL_MAX_MS);

    const res = await fetch(url, { headers: headers() });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`FortyGuard status check failed [${res.status}]: ${text}`);
    }

    const data = (await res.json()) as {
      status?: string;
      message?: string;
      result?: R;
      data?: {
        status?: string;
        result?: R;
      } & R;
    };

    const status = data.data?.status || data.status || data.message;

    if (status === "Completed") {
      const result = (data.data?.result ?? data.result ?? data.data) as R;
      if (!result) throw new Error("Completed but result is empty");
      return result;
    }

    if (status === "Failed") {
      throw new Error(`FortyGuard task ${activityId} failed: ${data.message ?? "unknown"}`);
    }

    // Still "Processing" — continue polling
  }

  throw new Error(`FortyGuard task ${activityId} timed out after ${POLL_TIMEOUT_MS / 1000}s`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── FortyGuard Client ──────────────────────────────────────────────────────
export class FortyGuardClient {
  // 1. Create Heatmap
  async createHeatmap(params: HeatmapRequest): Promise<HeatmapResult> {
    const activityId = await postActivity("/heatmap", params);
    return pollActivity<HeatmapResult>(activityId);
  }

  // 2. Satellite Segmentation
  async getSatelliteSegmentation(params: SatelliteRequest): Promise<SatelliteResult> {
    const activityId = await postActivity("/satellite", params);
    return pollActivity<SatelliteResult>(activityId);
  }

  // 3. Street View Segmentation
  async getStreetViewSegmentation(params: StreetViewRequest): Promise<StreetViewResult> {
    const activityId = await postActivity("/streetview", params);
    return pollActivity<StreetViewResult>(activityId);
  }

  // 4. Heat Intelligence
  async getHeatIntelligence(params: HeatIntelRequest): Promise<HeatIntelResult> {
    const activityId = await postActivity("/heat_intelligence", params);
    return pollActivity<HeatIntelResult>(activityId);
  }

  // 5. Environmental Parameters
  async getEnvironmentalParams(params: EnvParamsRequest): Promise<EnvParamsResult> {
    const activityId = await postActivity("/env_params", params);
    return pollActivity<EnvParamsResult>(activityId);
  }

  // Manual status check (for progress streaming)
  async checkStatus<T>(activityId: string): Promise<StatusResponse<T>> {
    const res = await fetch(`${BASE_URL}/status/${activityId}`, { headers: headers() });
    if (!res.ok) throw new Error(`Status check failed [${res.status}]`);
    return (await res.json()) as StatusResponse<T>;
  }

  // Get activity_id immediately without waiting (for async streaming)
  async startHeatmap(params: HeatmapRequest): Promise<string> {
    return postActivity("/heatmap", params);
  }

  async startSatellite(params: SatelliteRequest): Promise<string> {
    return postActivity("/satellite", params);
  }

  async startEnvParams(params: EnvParamsRequest): Promise<string> {
    return postActivity("/env_params", params);
  }

  async startHeatIntel(params: HeatIntelRequest): Promise<string> {
    return postActivity("/heat_intelligence", params);
  }
}

// Singleton for server use
export const fortyguard = new FortyGuardClient();

// ── Utility: C° ↔ F° ──────────────────────────────────────────────────────
export function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

export function fahrenheitToCelsius(f: number): number {
  return ((f - 32) * 5) / 9;
}

// ── Utility: Build default AOI polygon from center + radius ───────────────
export function buildAOIFromCenter(
  lat: number,
  lon: number,
  radiusKm: number = 2
): import("./fortyguard-types").GeoJSONFeatureCollection {
  // Approx degrees per km
  const latOffset = radiusKm / 111;
  const lonOffset = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [lon - lonOffset, lat - latOffset],
              [lon + lonOffset, lat - latOffset],
              [lon + lonOffset, lat + latOffset],
              [lon - lonOffset, lat + latOffset],
              [lon - lonOffset, lat - latOffset],
            ],
          ],
        },
        properties: {},
      },
    ],
  };
}

// ── Utility: Get yesterday's date ─────────────────────────────────────────
export function getYesterdayDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

export function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}
