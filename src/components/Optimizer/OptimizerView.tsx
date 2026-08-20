"use client";
// ─── Canopy & Shade Optimizer Studio ──────────────────────────────────────────

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { TREE_SPECIES, TreeSpecies } from "@/lib/catalog/tree-species";
import { SHADE_STRUCTURES, ShadeStructure } from "@/lib/catalog/shade-structures";
import { optimizeInterventions } from "@/lib/catalog/optimizer";
import { simulateCooling } from "@/lib/simulation/thermal-simulator";
import { calculateIrrigation } from "@/lib/irrigation/water-calculator";
import { generateRealisticHeatmap, buildAOIFromCenter } from "@/lib/fortyguard-client";

export default function OptimizerView() {
  const {
    city,
    lat,
    lon,
    budget,
    setBudget,
    preferences,
    setPreferences,
    hotspots,
    setHotspots,
    interventions,
    setInterventions,
    heatmapBefore,
    setHeatmapBefore,
    setHeatmapAfter,
    setTemperatureStats,
    setIrrigationPlan,
    setKPIs,
    setActiveMainTab,
  } = useAppStore();

  const [activeCatalogTab, setActiveCatalogTab] = useState<"allocated" | "trees" | "structures">("allocated");
  const [filterQuery, setFilterQuery] = useState("");
  const [isOptimizing, setIsOptimizing] = useState(false);

  const totalAllocated = interventions.reduce((s, i) => s + i.cost, 0);
  const treeCount = interventions.filter((i) => i.type === "tree").length;
  const structureCount = interventions.filter((i) => i.type === "shade_structure").length;
  const remainingBudget = Math.max(0, budget - totalAllocated);

  const handleOptimize = async () => {
    setIsOptimizing(true);
    try {
      // 1. Ensure we have baseline heatmap & hotspots
      let baseHeatmap = heatmapBefore;
      if (!baseHeatmap) {
        const aoi = buildAOIFromCenter(lat, lon, 2);
        baseHeatmap = generateRealisticHeatmap(aoi);
        setHeatmapBefore(baseHeatmap);
      }

      // 2. Generate hotspots if none
      let currentHotspots = hotspots;
      if (!currentHotspots || currentHotspots.length === 0) {
        currentHotspots = baseHeatmap.map_data.features.slice(0, 20).map((f, idx) => ({
          id: `spot_${idx}`,
          lat: f.geometry.coordinates[0][0][1] + (Math.random() - 0.5) * 0.005,
          lon: f.geometry.coordinates[0][0][0] + (Math.random() - 0.5) * 0.005,
          tempC: f.properties.temperature,
          tempF: (f.properties.temperature * 9) / 5 + 32,
          surfaceType: f.properties.surface_type || "asphalt",
          priority: idx < 8 ? "critical" : "high",
          recommendedAction: idx % 2 === 0 ? "tree_planting" : "shade_structure",
        }));
        setHotspots(currentHotspots);
      }

      // 3. Run Knapsack Optimizer
      const optResult = optimizeInterventions(currentHotspots, budget, {
        mode: preferences.mode,
        aestheticStyle: "modern",
        prioritizeZones: ["transit", "park"],
      });
      setInterventions(optResult.placements);

      // 4. Run Thermal Simulator
      const simResult = simulateCooling(baseHeatmap.map_data, optResult.placements);
      setHeatmapAfter(simResult.afterGeoJSON);
      setTemperatureStats(simResult.stats);

      // 5. Run Irrigation Plan
      const irrResult = calculateIrrigation(optResult.placements, {
        temperature_c: 39,
        humidity_pct: 22,
        solar_radiation_w_m2: 890,
        heat_index_c: 41,
        uv_index: 9.5,
        wind_speed_ms: 3.2,
      }, preferences.mode === "low_water");
      setIrrigationPlan(irrResult);

      // 6. Update KPIs
      setKPIs({
        totalBudgetUsed: optResult.summary.totalCost,
        remainingBudget: budget - optResult.summary.totalCost,
        totalInterventions: optResult.placements.length,
        treeCount: optResult.summary.treeCount,
        structureCount: optResult.summary.structureCount,
        averageCoolingDeltaF: simResult.stats.avgDeltaF,
        maxCoolingDeltaF: simResult.stats.maxDeltaF,
        budgetEfficiencyDollarPerDegree: optResult.summary.totalCost / Math.max(simResult.stats.avgDeltaF, 0.1),
        treeSurvivalRatePercent: optResult.summary.treeSurvivalRateEstimate * 100,
        weeklyWaterSavedGallons: irrResult.savedVsStaticGallons,
        annualCO2OffsetKg: optResult.summary.treeCount * 22,
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const filteredTrees = TREE_SPECIES.filter(
    (t) =>
      t.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      t.scientificName.toLowerCase().includes(filterQuery.toLowerCase()) ||
      t.droughtTolerance.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const filteredStructures = SHADE_STRUCTURES.filter(
    (s) =>
      s.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      s.type.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflowY: "auto", padding: "var(--space-lg)" }}>
      {/* Top Banner & Control Deck */}
      <div
        className="glass-panel"
        style={{
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-md) var(--space-lg)",
          marginBottom: "var(--space-lg)",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1.5rem",
        }}
      >
        <div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)" }}>
            🌳 Canopy & Shade Optimizer Studio
          </div>
          <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
            Target Location: <strong style={{ color: "#34d399" }}>{city}</strong> ({lat.toFixed(4)}, {lon.toFixed(4)})
          </div>
        </div>

        {/* Budget Control */}
        <div style={{ minWidth: 220 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 700, marginBottom: "0.3rem" }}>
            <span style={{ color: "var(--text-secondary)" }}>Budget Allocation</span>
            <span style={{ color: "var(--accent-gold-bright)" }}>${budget.toLocaleString()}</span>
          </div>
          <input
            type="range"
            min={10000}
            max={2000000}
            step={10000}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="slider-input"
          />
        </div>

        {/* Priority Strategy */}
        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.3rem", textTransform: "uppercase" }}>
            Optimization Objective
          </div>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {(["balanced", "max_cooling", "low_water", "fast_shade"] as const).map((mode) => (
              <button
                key={mode}
                className={`priority-btn ${preferences.mode === mode ? "active" : ""}`}
                style={{ padding: "0.4rem 0.75rem" }}
                onClick={() => setPreferences({ mode })}
              >
                {mode === "balanced"
                  ? "⚖️ Balanced"
                  : mode === "max_cooling"
                  ? "🌡️ Max Cool"
                  : mode === "low_water"
                  ? "💧 Low Water"
                  : "⚡ Fast Shade"}
              </button>
            ))}
          </div>
        </div>

        {/* 1-Click Optimize Button */}
        <div>
          <button
            className="btn-primary"
            onClick={handleOptimize}
            disabled={isOptimizing}
            style={{ padding: "0.75rem 1.4rem" }}
          >
            {isOptimizing ? "⏳ Optimizing..." : "⚡ Run Optimizer"}
          </button>
        </div>
      </div>

      {/* KPI Stats Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-md)", marginBottom: "var(--space-lg)" }}>
        <div className="glass-card" style={{ padding: "var(--space-md)" }}>
          <div className="kpi-label">Total Allocated</div>
          <div className="kpi-val" style={{ color: "var(--accent-gold-bright)" }}>
            ${totalAllocated.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.72rem", color: "#34d399", marginTop: "0.2rem" }}>
            ${remainingBudget.toLocaleString()} remaining
          </div>
        </div>

        <div className="glass-card" style={{ padding: "var(--space-md)" }}>
          <div className="kpi-label">Tree Interventions</div>
          <div className="kpi-val" style={{ color: "#34d399" }}>
            {treeCount} Trees
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
            15 climate-resilient species
          </div>
        </div>

        <div className="glass-card" style={{ padding: "var(--space-md)" }}>
          <div className="kpi-label">Shade Structures</div>
          <div className="kpi-val" style={{ color: "#06b6d4" }}>
            {structureCount} Units
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
            High-albedo engineered panels
          </div>
        </div>

        <div className="glass-card" style={{ padding: "var(--space-md)" }}>
          <div className="kpi-label">Action</div>
          <button
            onClick={() => setActiveMainTab("heatmap")}
            style={{
              width: "100%",
              marginTop: "0.4rem",
              padding: "0.5rem",
              background: "rgba(16, 185, 129, 0.2)",
              border: "1px solid var(--border-accent)",
              borderRadius: "var(--radius-sm)",
              color: "#34d399",
              fontSize: "0.8rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            🗺️ View on Map →
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs (Allocated vs Tree Catalog vs Structure Catalog) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            className={`map-toggle-btn ${activeCatalogTab === "allocated" ? "active" : ""}`}
            onClick={() => setActiveCatalogTab("allocated")}
          >
            📋 Allocated Interventions ({interventions.length})
          </button>
          <button
            className={`map-toggle-btn ${activeCatalogTab === "trees" ? "active" : ""}`}
            onClick={() => setActiveCatalogTab("trees")}
          >
            🌳 Tree Species Catalog ({TREE_SPECIES.length})
          </button>
          <button
            className={`map-toggle-btn ${activeCatalogTab === "structures" ? "active" : ""}`}
            onClick={() => setActiveCatalogTab("structures")}
          >
            🏛️ Shade Structures Catalog ({SHADE_STRUCTURES.length})
          </button>
        </div>

        <input
          type="text"
          placeholder="Filter species & structures..."
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          className="text-input"
          style={{ maxWidth: 260 }}
        />
      </div>

      {/* Tab 1: Allocated Interventions Table */}
      {activeCatalogTab === "allocated" && (
        <div className="glass-panel" style={{ borderRadius: "var(--radius-lg)", padding: "var(--space-md)", flex: 1 }}>
          {interventions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-secondary)" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🌳</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                No Interventions Allocated Yet
              </div>
              <div style={{ fontSize: "0.85rem", marginTop: "0.3rem", maxWidth: 400, margin: "0.3rem auto 1.5rem auto" }}>
                Click "Run Optimizer" above to automatically calculate and place the best tree and shade structures for {city}.
              </div>
              <button className="btn-primary" onClick={handleOptimize} style={{ maxWidth: 220, margin: "0 auto" }}>
                ⚡ Auto-Optimize Now
              </button>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-medium)", color: "var(--text-secondary)", textAlign: "left" }}>
                    <th style={{ padding: "0.75rem 1rem" }}>Type</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Item Name</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Coordinates</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Unit Cost</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Cooling Contribution</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Water Requirement</th>
                  </tr>
                </thead>
                <tbody>
                  {interventions.map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                      }}
                    >
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <span
                          className="pill"
                          style={{
                            background: item.type === "tree" ? "rgba(16,185,129,0.15)" : "rgba(6,182,212,0.15)",
                            color: item.type === "tree" ? "#34d399" : "#06b6d4",
                          }}
                        >
                          {item.type === "tree" ? "🌳 Tree" : "🏛️ Structure"}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        {item.name}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontFamily: "monospace" }}>
                        {item.lat.toFixed(4)}, {item.lon.toFixed(4)}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "var(--accent-gold-bright)", fontWeight: 700 }}>
                        ${item.cost.toLocaleString()}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "#34d399", fontWeight: 700 }}>
                        −{item.coolingDeltaF.toFixed(1)}°F
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)" }}>
                        {item.waterGalPerDay} gal/day
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Tree Species Catalog Grid */}
      {activeCatalogTab === "trees" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--space-md)" }}>
          {filteredTrees.map((tree) => (
            <div key={tree.id} className="glass-card" style={{ padding: "var(--space-md)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)" }}>
                    {tree.emoji} {tree.name}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                    {tree.scientificName}
                  </div>
                </div>
                <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--accent-gold-bright)" }}>
                  ${tree.costPerUnit}
                </div>
              </div>

              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                {tree.description}
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.3rem", fontSize: "0.72rem", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.4rem" }}>
                <div>Canopy: <strong style={{ color: "var(--text-primary)" }}>{tree.matureCanopySpreadFt} ft</strong></div>
                <div>Drought: <strong style={{ color: "#34d399" }}>{tree.droughtTolerance}</strong></div>
                <div>Water: <strong style={{ color: "#06b6d4" }}>{tree.waterGallonsPerDayBase} gal/day</strong></div>
                <div>Cooling: <strong style={{ color: "#34d399" }}>−{tree.coolingEffectDeltaF}°F</strong></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Shade Structures Catalog Grid */}
      {activeCatalogTab === "structures" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--space-md)" }}>
          {filteredStructures.map((struct) => (
            <div key={struct.id} className="glass-card" style={{ padding: "var(--space-md)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)" }}>
                    {struct.emoji} {struct.name}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--accent-green-bright)" }}>
                    Albedo: {struct.albedo} (High Reflectance)
                  </div>
                </div>
                <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--accent-gold-bright)" }}>
                  ${struct.costPerUnit.toLocaleString()}
                </div>
              </div>

              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                {struct.description}
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.3rem", fontSize: "0.72rem", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.4rem" }}>
                <div>Footprint: <strong style={{ color: "var(--text-primary)" }}>{struct.coverageAreaSqFt} sq ft</strong></div>
                <div>Cooling: <strong style={{ color: "#06b6d4" }}>−{struct.coolingDeltaF}°F</strong></div>
                <div>Wind Rating: <strong style={{ color: "var(--text-primary)" }}>{struct.windRatingMph} mph</strong></div>
                <div>Lifespan: <strong style={{ color: "var(--text-primary)" }}>{struct.lifespanYears} yrs</strong></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
