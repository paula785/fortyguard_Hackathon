// ─── Engineered Shade Structures Catalog ──────────────────────────────────────

export type ShadeStructureShape = "triangle-sail" | "rectangle-awning" | "hexagon-gazebo" | "pyramid" | "butterfly";
export type AestheticStyle = "modern" | "traditional" | "natural" | "industrial";

export interface ShadeStructure {
  id: string;
  name: string;
  emoji: string;
  shapeType: ShadeStructureShape;
  coverageAreaSqFt: number;
  albedoRating: number;           // 0-1 (1 = perfect reflector)
  solarBlockingPercent: number;   // % of direct solar radiation blocked
  installCost: number;            // USD
  maintenanceCostPerYear: number;
  coolingEffectDeltaF: number;    // ambient temp reduction under structure
  aestheticStyle: AestheticStyle;
  footprintWidthFt: number;
  footprintLengthFt: number;
  bestFor: string[];
  description: string;
  color: string;                  // display color for map rendering
  lifeYears: number;
  type?: string;
  albedo?: number;
  costPerUnit?: number;
  coolingDeltaF?: number;
  windRatingMph?: number;
  lifespanYears?: number;
}

export const SHADE_STRUCTURES: ShadeStructure[] = [
  {
    id: "tensile-triangle-sail",
    name: "Tensile Triangle Sail",
    emoji: "⛵",
    shapeType: "triangle-sail",
    coverageAreaSqFt: 400,
    albedoRating: 0.82,
    solarBlockingPercent: 92,
    installCost: 8500,
    maintenanceCostPerYear: 200,
    coolingEffectDeltaF: 7.0,
    aestheticStyle: "modern",
    footprintWidthFt: 28,
    footprintLengthFt: 28,
    bestFor: ["plaza", "outdoor-dining", "transit", "playground"],
    description: "High-performance HDPE fabric sail. Lightweight, breathable, ideal for modern urban plazas and transit stops.",
    color: "#1769b0",
    lifeYears: 15,
  },
  {
    id: "rectangle-fabric-awning",
    name: "Rectangular Fabric Awning",
    emoji: "🏠",
    shapeType: "rectangle-awning",
    coverageAreaSqFt: 600,
    albedoRating: 0.75,
    solarBlockingPercent: 88,
    installCost: 12000,
    maintenanceCostPerYear: 350,
    coolingEffectDeltaF: 6.5,
    aestheticStyle: "traditional",
    footprintWidthFt: 20,
    footprintLengthFt: 30,
    bestFor: ["bus-stop", "sidewalk", "building-facade", "market"],
    description: "Classic rectangular tensile shade structure. Modular design allows end-to-end chaining along corridors.",
    color: "#0f86a1",
    lifeYears: 12,
  },
  {
    id: "hexagon-gazebo",
    name: "Hexagonal Steel Gazebo",
    emoji: "⬡",
    shapeType: "hexagon-gazebo",
    coverageAreaSqFt: 350,
    albedoRating: 0.70,
    solarBlockingPercent: 95,
    installCost: 18000,
    maintenanceCostPerYear: 600,
    coolingEffectDeltaF: 8.0,
    aestheticStyle: "traditional",
    footprintWidthFt: 22,
    footprintLengthFt: 22,
    bestFor: ["park", "plaza", "senior-center", "school"],
    description: "Permanent hexagonal steel structure with polycarbonate roof. Maximum shade and rain protection. Long-lasting.",
    color: "#27ae60",
    lifeYears: 30,
  },
  {
    id: "pyramid-canopy",
    name: "Pyramid Canopy",
    emoji: "🔺",
    shapeType: "pyramid",
    coverageAreaSqFt: 500,
    albedoRating: 0.88,
    solarBlockingPercent: 97,
    installCost: 22000,
    maintenanceCostPerYear: 400,
    coolingEffectDeltaF: 9.0,
    aestheticStyle: "modern",
    footprintWidthFt: 25,
    footprintLengthFt: 25,
    bestFor: ["bus-stop", "transit-hub", "plaza", "parking"],
    description: "High-albedo pyramid structure with cool white PTFE coating. Premium cooling performance for transit hubs.",
    color: "#e0713c",
    lifeYears: 25,
  },
  {
    id: "butterfly-shade",
    name: "Butterfly Shade Structure",
    emoji: "🦋",
    shapeType: "butterfly",
    coverageAreaSqFt: 700,
    albedoRating: 0.85,
    solarBlockingPercent: 90,
    installCost: 28000,
    maintenanceCostPerYear: 700,
    coolingEffectDeltaF: 7.8,
    aestheticStyle: "modern",
    footprintWidthFt: 35,
    footprintLengthFt: 35,
    bestFor: ["school", "park", "playground", "outdoor-dining"],
    description: "Sculptural butterfly-wing design. Large coverage with rainwater harvesting capability. Landmark aesthetic.",
    color: "#9b59b6",
    lifeYears: 20,
  },
  {
    id: "compact-bus-shelter",
    name: "Compact Shade Bus Shelter",
    emoji: "🚌",
    shapeType: "rectangle-awning",
    coverageAreaSqFt: 120,
    albedoRating: 0.80,
    solarBlockingPercent: 98,
    installCost: 4500,
    maintenanceCostPerYear: 150,
    coolingEffectDeltaF: 6.0,
    aestheticStyle: "industrial",
    footprintWidthFt: 10,
    footprintLengthFt: 12,
    bestFor: ["bus-stop", "transit", "sidewalk"],
    description: "Purpose-built transit shelter with integrated LED lighting and cool-surface bench. High UV blocking.",
    color: "#3d9bd8",
    lifeYears: 20,
  },
];

export function getStructureById(id: string): ShadeStructure | undefined {
  return SHADE_STRUCTURES.find((s) => s.id === id);
}

export function getStructuresByStyle(style: AestheticStyle): ShadeStructure[] {
  return SHADE_STRUCTURES.filter((s) => s.aestheticStyle === style);
}

export function getCoolingCostRatio(s: ShadeStructure): number {
  // Dollars per °F cooling achieved
  return s.installCost / s.coolingEffectDeltaF;
}
