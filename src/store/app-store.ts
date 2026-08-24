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

export type MapLayer = "heatmap-before" | "heatmap-after" | "split-wipe" | "interventions";
export type MainTab = "heatmap" | "optimizer" | "irrigation" | "chat" | "compare" | "export";
export type RightTab = "kpi" | "catalog" | "irrigation" | "export";

export interface ApiTelemetry {
  isLive: boolean;
  taskId?: string;
  latencyMs?: number;
  endpoint?: string;
  timestamp?: string;
  requestPayload?: unknown;
  responsePayload?: unknown;
  resolutionMeters?: number;
  source?: string;
  featuresCount?: number;
}

export interface ScenarioRecord {
  id: string;
  name: string;
  budget: number;
  mode: string;
  totalCost: number;
  avgCoolingF: number;
  peakCoolingF: number;
  weeklyWaterGal: number;
  carbonKgYr: number;
  energySavedKwh: number;
  stormwaterGalYr: number;
  treeCount: number;
  shadeCount: number;
  timestamp: string;
}

interface AppState {
  // Location
  city: string;
  lat: number;
  lon: number;

  // Temporal & Granularity Controls
  analysisDate: string;
  analysisHour: number; // 0 - 23
  granularity: number; // 50, 100, 250

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

  // Telemetry & Inspector
  apiTelemetry: ApiTelemetry | null;
  showPayloadModal: boolean;

  // Map Interactive Features
  splitWipePercent: number; // 0 to 100
  isSplitWipeActive: boolean;
  sandboxMode: boolean;
  selectedCatalogItem: string | null;

  // Auth & Onboarding (PRD §5.2 Screen 1)
  userRole: "municipality" | "esg";
  userEmail: string;
  showOnboardingModal: boolean;

  // Scenarios
  scenarios: ScenarioRecord[];

  // UI state
  activeMainTab: MainTab;
  activeLayer: MapLayer;
  rightTab: RightTab;
  isAgentRunning: boolean;
  agentSteps: AgentStep[];
  chatMessages: ChatMessage[];

  // Actions
  setUserRole: (role: "municipality" | "esg") => void;
  setUserEmail: (email: string) => void;
  setShowOnboardingModal: (show: boolean) => void;
  setActiveMainTab: (tab: MainTab) => void;
  setCity: (city: string) => void;
  setLatLon: (lat: number, lon: number) => void;
  setAnalysisDate: (date: string) => void;
  setAnalysisHour: (hour: number) => void;
  setGranularity: (granularity: number) => void;
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
  updateIntervention: (id: string, partial: Partial<InterventionPlacement>) => void;
  setTemperatureStats: (stats: TemperatureStats | null) => void;
  setIrrigationPlan: (plan: IrrigationPlan | null) => void;
  setKPIs: (kpis: KPIReport | null) => void;
  setApiTelemetry: (telemetry: ApiTelemetry | null) => void;
  setShowPayloadModal: (show: boolean) => void;
  setSplitWipePercent: (percent: number) => void;
  setIsSplitWipeActive: (active: boolean) => void;
  setSandboxMode: (active: boolean) => void;
  setSelectedCatalogItem: (id: string | null) => void;
  addScenario: (scenario: ScenarioRecord) => void;
  deleteScenario: (id: string) => void;
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
  analysisDate: "2024-07-15",
  analysisHour: 14,
  granularity: 100,
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

  apiTelemetry: {
    isLive: false,
    taskId: "init_seed_001",
    latencyMs: 142,
    endpoint: "FortyGuard /heatmap",
    timestamp: new Date().toISOString(),
    resolutionMeters: 100,
    source: "FortyGuard Microclimate Engine",
  },
  showPayloadModal: false,

  // Auth & Onboarding initial state
  userRole: "municipality",
  userEmail: "urban.planner@phoenix.gov",
  showOnboardingModal: false,

  splitWipePercent: 50,
  isSplitWipeActive: false,
  sandboxMode: false,
  selectedCatalogItem: null,

  scenarios: [],

  activeMainTab: "heatmap",
  activeLayer: "heatmap-before",
  rightTab: "kpi",
  isAgentRunning: false,
  agentSteps: [],
  chatMessages: [
    {
      id: "welcome",
      role: "assistant",
      content:
        "👋 Welcome to **UrbanCool AI**! I'm your autonomous microclimate planning assistant.\n\nDescribe the area you want to analyze — for example:\n\n*\"Analyze downtown Phoenix pedestrian corridors near transit stops with a $250K budget, prioritizing low water usage.\"*\n\nI'll fetch live temperature data, identify heat islands, and design an optimal cooling blueprint.",
      timestamp: new Date().toISOString(),
    },
  ],

  // Setters
  setUserRole: (userRole) => set({ userRole }),
  setUserEmail: (userEmail) => set({ userEmail }),
  setShowOnboardingModal: (showOnboardingModal) => set({ showOnboardingModal }),
  setActiveMainTab: (activeMainTab) => set({ activeMainTab }),
  setCity: (city) => set({ city }),
  setLatLon: (lat, lon) => set({ lat, lon }),
  setAnalysisDate: (analysisDate) => set({ analysisDate }),
  setAnalysisHour: (analysisHour) => set({ analysisHour }),
  setGranularity: (granularity) => set({ granularity }),
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
  updateIntervention: (id, partial) =>
    set((s) => ({
      interventions: s.interventions.map((i) =>
        i.id === id ? { ...i, ...partial } : i
      ),
    })),
  setTemperatureStats: (temperatureStats) => set({ temperatureStats }),
  setIrrigationPlan: (irrigationPlan) => set({ irrigationPlan }),
  setKPIs: (kpis) => set({ kpis }),
  setApiTelemetry: (apiTelemetry) => set({ apiTelemetry }),
  setShowPayloadModal: (showPayloadModal) => set({ showPayloadModal }),
  setSplitWipePercent: (splitWipePercent) => set({ splitWipePercent }),
  setIsSplitWipeActive: (isSplitWipeActive) => set({ isSplitWipeActive }),
  setSandboxMode: (sandboxMode) => set({ sandboxMode }),
  setSelectedCatalogItem: (selectedCatalogItem) => set({ selectedCatalogItem }),
  addScenario: (scenario) =>
    set((s) => ({ scenarios: [scenario, ...s.scenarios.slice(0, 7)] })),
  deleteScenario: (id) =>
    set((s) => ({ scenarios: s.scenarios.filter((sc) => sc.id !== id) })),
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
