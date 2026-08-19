// ─── Zustand Global State Store ───────────────────────────────────────────────

import { create } from "zustand";
import type {
  GeoJSONFeatureCollection,
  HeatmapResult,
  EnvParamsResult,
  Hotspot,
  InterventionPlacement,
  TemperatureStats,
  IrrigationPlan,
  KPIReport,
  UserPreferences,
} from "@/lib/fortyguard-types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  data?: unknown;
}

export interface AgentStep {
  type: "progress" | "tool_result" | "message" | "complete" | "error";
  message: string;
  data?: unknown;
  stepIndex?: number;
}

export type MapLayer = "heatmap-before" | "heatmap-after" | "interventions";
export type RightTab = "kpi" | "catalog" | "irrigation" | "export";

interface AppState {
  // Location
  city: string;
  lat: number;
  lon: number;

  // Planning inputs
  budget: number;
  userBrief: string;
  preferences: UserPreferences;
  aoi: GeoJSONFeatureCollection | null;

  // Data
  heatmapBefore: HeatmapResult | null;
  heatmapAfter: { type: "FeatureCollection"; features: unknown[] } | null;
  envParams: EnvParamsResult | null;
  hotspots: Hotspot[];
  interventions: InterventionPlacement[];
  temperatureStats: TemperatureStats | null;
  irrigationPlan: IrrigationPlan | null;
  kpis: KPIReport | null;

  // UI state
  activeLayer: MapLayer;
  rightTab: RightTab;
  isAgentRunning: boolean;
  agentSteps: AgentStep[];
  chatMessages: ChatMessage[];

  // Actions
  setCity: (city: string) => void;
  setLatLon: (lat: number, lon: number) => void;
  setBudget: (budget: number) => void;
  setUserBrief: (brief: string) => void;
  setPreferences: (prefs: Partial<UserPreferences>) => void;
  setAOI: (aoi: GeoJSONFeatureCollection | null) => void;
  setHeatmapBefore: (data: HeatmapResult | null) => void;
  setHeatmapAfter: (data: AppState["heatmapAfter"]) => void;
  setEnvParams: (data: EnvParamsResult | null) => void;
  setHotspots: (hotspots: Hotspot[]) => void;
  setInterventions: (interventions: InterventionPlacement[]) => void;
  addIntervention: (intervention: InterventionPlacement) => void;
  removeIntervention: (id: string) => void;
  setTemperatureStats: (stats: TemperatureStats | null) => void;
  setIrrigationPlan: (plan: IrrigationPlan | null) => void;
  setKPIs: (kpis: KPIReport | null) => void;
  setActiveLayer: (layer: MapLayer) => void;
  setRightTab: (tab: RightTab) => void;
  setAgentRunning: (running: boolean) => void;
  addAgentStep: (step: AgentStep) => void;
  clearAgentSteps: () => void;
  addChatMessage: (msg: Omit<ChatMessage, "id" | "timestamp">) => void;
  clearAll: () => void;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  mode: "balanced",
  aestheticStyle: "modern",
  prioritizeZones: ["transit", "park"],
};

// Phoenix, AZ defaults
const DEFAULT_LAT = 33.4484;
const DEFAULT_LON = -112.074;
const DEFAULT_CITY = "Phoenix, AZ";

export const useAppStore = create<AppState>((set) => ({
  // Defaults
  city: DEFAULT_CITY,
  lat: DEFAULT_LAT,
  lon: DEFAULT_LON,
  budget: 250000,
  userBrief: "",
  preferences: DEFAULT_PREFERENCES,
  aoi: null,

  heatmapBefore: null,
  heatmapAfter: null,
  envParams: null,
  hotspots: [],
  interventions: [],
  temperatureStats: null,
  irrigationPlan: null,
  kpis: null,

  activeLayer: "heatmap-before",
  rightTab: "kpi",
  isAgentRunning: false,
  agentSteps: [],
  chatMessages: [
    {
      id: "welcome",
      role: "assistant",
      content:
        "👋 Welcome to **UrbanCanopy AI**! I'm your autonomous microclimate planning assistant.\n\nDescribe the area you want to analyze — for example:\n\n*\"Analyze downtown Phoenix pedestrian corridors near transit stops with a $250K budget, prioritizing low water usage.\"*\n\nI'll fetch live temperature data, identify heat islands, and design an optimal cooling blueprint.",
      timestamp: new Date().toISOString(),
    },
  ],

  // Setters
  setCity: (city) => set({ city }),
  setLatLon: (lat, lon) => set({ lat, lon }),
  setBudget: (budget) => set({ budget }),
  setUserBrief: (userBrief) => set({ userBrief }),
  setPreferences: (prefs) =>
    set((s) => ({ preferences: { ...s.preferences, ...prefs } })),
  setAOI: (aoi) => set({ aoi }),
  setHeatmapBefore: (heatmapBefore) => set({ heatmapBefore }),
  setHeatmapAfter: (heatmapAfter) => set({ heatmapAfter }),
  setEnvParams: (envParams) => set({ envParams }),
  setHotspots: (hotspots) => set({ hotspots }),
  setInterventions: (interventions) => set({ interventions }),
  addIntervention: (intervention) =>
    set((s) => ({ interventions: [...s.interventions, intervention] })),
  removeIntervention: (id) =>
    set((s) => ({ interventions: s.interventions.filter((i) => i.id !== id) })),
  setTemperatureStats: (temperatureStats) => set({ temperatureStats }),
  setIrrigationPlan: (irrigationPlan) => set({ irrigationPlan }),
  setKPIs: (kpis) => set({ kpis }),
  setActiveLayer: (activeLayer) => set({ activeLayer }),
  setRightTab: (rightTab) => set({ rightTab }),
  setAgentRunning: (isAgentRunning) => set({ isAgentRunning }),
  addAgentStep: (step) =>
    set((s) => ({ agentSteps: [...s.agentSteps, step] })),
  clearAgentSteps: () => set({ agentSteps: [] }),
  addChatMessage: (msg) =>
    set((s) => ({
      chatMessages: [
        ...s.chatMessages,
        { ...msg, id: `msg-${Date.now()}`, timestamp: new Date().toISOString() },
      ],
    })),
  clearAll: () =>
    set({
      heatmapBefore: null,
      heatmapAfter: null,
      envParams: null,
      hotspots: [],
      interventions: [],
      temperatureStats: null,
      irrigationPlan: null,
      kpis: null,
      agentSteps: [],
      aoi: null,
    }),
}));
