"use client";
// ─── Multi-Scenario Comparison Matrix ──────────────────────────────────────────
// Allows municipal planners to compare multiple urban cooling strategies side-by-side:
// Budget, Cooling Efficacy, Diurnal Water Needs, Carbon Sequestration, and ROI.

import React from "react";
import { useAppStore, ScenarioRecord } from "@/store/app-store";

export default function ScenarioComparison() {
  const {
    scenarios,
    deleteScenario,
    setActiveMainTab,
    setBudget,
    setPreferences,
    city,
  } = useAppStore();

  const PRESET_SCENARIOS: ScenarioRecord[] = [
    {
      id: "preset_low_water",
      name: `${city} — Water-Resilient Blueprint`,
      budget: 150000,
      mode: "low_water",
      totalCost: 142300,
      avgCoolingF: 6.4,
      peakCoolingF: 11.2,
      weeklyWaterGal: 1820,
      carbonKgYr: 3100,
      energySavedKwh: 24500,
      stormwaterGalYr: 42000,
      treeCount: 68,
      shadeCount: 14,
      timestamp: "Optimized for Drought",
    },
    {
      id: "preset_max_cooling",
      name: `${city} — Maximum Thermal Relief`,
      budget: 350000,
      mode: "max_cooling",
      totalCost: 338600,
      avgCoolingF: 9.8,
      peakCoolingF: 16.5,
      weeklyWaterGal: 4600,
      carbonKgYr: 6800,
      energySavedKwh: 58000,
      stormwaterGalYr: 94000,
      treeCount: 145,
      shadeCount: 32,
      timestamp: "Optimized for Heat Relief",
    },
    {
      id: "preset_fast_shade",
      name: `${city} — Rapid Engineered Canopy`,
      budget: 200000,
      mode: "fast_shade",
      totalCost: 194000,
      avgCoolingF: 7.2,
      peakCoolingF: 14.8,
      weeklyWaterGal: 1100,
      carbonKgYr: 1800,
      energySavedKwh: 36000,
      stormwaterGalYr: 31000,
      treeCount: 34,
      shadeCount: 42,
      timestamp: "Zero-Water Fast Shade",
    },
  ];

  const allScenarios = scenarios.length > 0 ? scenarios : PRESET_SCENARIOS;

  const handleApplyScenario = (s: ScenarioRecord) => {
    setBudget(s.budget);
    setPreferences({ mode: s.mode as any });
    setActiveMainTab("heatmap");
  };

  const exportComparisonCSV = () => {
    const headers = [
      "Scenario Name",
      "Strategy Mode",
      "Budget ($)",
      "Total Cost ($)",
      "Avg Cooling (deg F)",
      "Peak Cooling (deg F)",
      "Weekly Water (gal)",
      "Annual CO2 (kg)",
      "Annual Energy Saved (kWh)",
      "Trees",
      "Shade Structures",
    ];

    const rows = allScenarios.map((s) => [
      `"${s.name}"`,
      s.mode,
      s.budget,
      s.totalCost,
      s.avgCoolingF,
      s.peakCoolingF,
      s.weeklyWaterGal,
      s.carbonKgYr,
      s.energySavedKwh,
      s.treeCount,
      s.shadeCount,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `UrbanCanopy_Scenario_Comparison_${city.replace(/[^a-zA-Z0-9]/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflowY: "auto",
        padding: "2rem",
        background: "var(--bg-primary, #061510)",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.8rem" }}>📊</span>
              <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary, #f8fafc)" }}>
                Multi-Scenario Urban Cooling Matrix
              </h1>
            </div>
            <p style={{ margin: "0.3rem 0 0", fontSize: "0.85rem", color: "var(--text-secondary, #94a3b8)" }}>
              Compare investment trade-offs between water efficiency, thermal relief, carbon offsets, and capital expenditure for <strong>{city}</strong>.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={exportComparisonCSV}
              className="btn-primary"
              style={{ padding: "0.55rem 1.1rem", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              <span>📥</span>
              <span>Export Comparison CSV</span>
            </button>
          </div>
        </div>

        {/* Side-by-Side Comparison Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
          {allScenarios.map((s, idx) => (
            <div
              key={s.id || idx}
              className="glass-card"
              style={{
                padding: "1.35rem",
                borderRadius: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                border: idx === 0 ? "1.5px solid rgba(52, 211, 153, 0.4)" : "1px solid rgba(255, 255, 255, 0.08)",
                background: "rgba(15, 23, 42, 0.75)",
              }}
            >
              {/* Card Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span
                    style={{
                      fontSize: "0.68rem",
                      padding: "0.2rem 0.5rem",
                      borderRadius: "4px",
                      background:
                        s.mode === "low_water"
                          ? "rgba(56, 189, 248, 0.2)"
                          : s.mode === "max_cooling"
                          ? "rgba(168, 85, 247, 0.2)"
                          : "rgba(16, 185, 129, 0.2)",
                      color:
                        s.mode === "low_water"
                          ? "#38bdf8"
                          : s.mode === "max_cooling"
                          ? "#c084fc"
                          : "#34d399",
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    {s.mode.replace("_", " ")}
                  </span>
                  <h3 style={{ margin: "0.5rem 0 0", fontSize: "1.05rem", fontWeight: 800, color: "#f8fafc" }}>
                    {s.name}
                  </h3>
                </div>
                {scenarios.some((sc) => sc.id === s.id) && (
                  <button
                    onClick={() => deleteScenario(s.id)}
                    style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.85rem" }}
                    title="Remove scenario"
                  >
                    🗑️
                  </button>
                )}
              </div>

              {/* Key Highlights Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                <div style={{ background: "rgba(0,0,0,0.3)", padding: "0.6rem", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.68rem", color: "#94a3b8" }}>Avg Cooling (Treated Zones)</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#34d399" }}>
                    −{s.avgCoolingF > 0 ? s.avgCoolingF.toFixed(1) : "< 1"}°F
                  </div>
                </div>
                <div style={{ background: "rgba(0,0,0,0.3)", padding: "0.6rem", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.68rem", color: "#94a3b8" }}>Peak Corridor Relief</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#38bdf8" }}>
                    −{s.peakCoolingF}°F
                  </div>
                </div>
                <div style={{ background: "rgba(0,0,0,0.3)", padding: "0.6rem", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.68rem", color: "#94a3b8" }}>Weekly Water Demand</div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#fbbf24" }}>
                    {s.weeklyWaterGal.toLocaleString()} gal
                  </div>
                </div>
                <div style={{ background: "rgba(0,0,0,0.3)", padding: "0.6rem", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.68rem", color: "#94a3b8" }}>Total Capex Budget</div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#f8fafc" }}>
                    ${s.totalCost.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* i-Tree Eco & Asset Breakdown */}
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", display: "flex", flexDirection: "column", gap: "0.3rem", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.6rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>🌳 Trees Planted:</span>
                  <strong style={{ color: "#f8fafc" }}>{s.treeCount} units</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>⛺ Shade Structures:</span>
                  <strong style={{ color: "#f8fafc" }}>{s.shadeCount} structures</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>🌱 Annual CO₂ Offset:</span>
                  <strong style={{ color: "#34d399" }}>{s.carbonKgYr.toLocaleString()} kg/yr</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>⚡ Building Energy Saved:</span>
                  <strong style={{ color: "#38bdf8" }}>{s.energySavedKwh.toLocaleString()} kWh/yr</strong>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleApplyScenario(s)}
                className="btn-primary"
                style={{
                  width: "100%",
                  padding: "0.55rem",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  marginTop: "auto",
                }}
              >
                Load Blueprint in Heatmap 🗺️
              </button>
            </div>
          ))}
        </div>

        {/* Detailed Comparison Table */}
        <div className="glass-card" style={{ padding: "1.5rem", borderRadius: "16px" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem", fontWeight: 800, color: "#f8fafc" }}>
            Comprehensive Scenario Benchmark Matrix
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.12)", color: "#94a3b8" }}>
                  <th style={{ padding: "0.6rem 0.8rem" }}>Scenario</th>
                  <th style={{ padding: "0.6rem 0.8rem" }}>Budget Cap</th>
                  <th style={{ padding: "0.6rem 0.8rem" }}>Actual Spend</th>
                  <th style={{ padding: "0.6rem 0.8rem" }}>Avg Cooling (Treated)</th>
                  <th style={{ padding: "0.6rem 0.8rem" }}>Peak Cooling</th>
                  <th style={{ padding: "0.6rem 0.8rem" }}>Weekly Water</th>
                  <th style={{ padding: "0.6rem 0.8rem" }}>CO₂ Offset</th>
                  <th style={{ padding: "0.6rem 0.8rem" }}>HVAC Savings</th>
                </tr>
              </thead>
              <tbody>
                {allScenarios.map((s, i) => (
                  <tr
                    key={s.id || i}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                    }}
                  >
                    <td style={{ padding: "0.75rem 0.8rem", fontWeight: 700, color: "#f8fafc" }}>{s.name}</td>
                    <td style={{ padding: "0.75rem 0.8rem", color: "#94a3b8" }}>${s.budget.toLocaleString()}</td>
                    <td style={{ padding: "0.75rem 0.8rem", fontWeight: 600, color: "#f8fafc" }}>${s.totalCost.toLocaleString()}</td>
                    <td style={{ padding: "0.75rem 0.8rem", fontWeight: 700, color: "#34d399" }}>−{s.avgCoolingF > 0 ? s.avgCoolingF.toFixed(1) : "< 1"}°F</td>
                    <td style={{ padding: "0.75rem 0.8rem", fontWeight: 700, color: "#38bdf8" }}>−{s.peakCoolingF}°F</td>
                    <td style={{ padding: "0.75rem 0.8rem", color: "#fbbf24" }}>{s.weeklyWaterGal.toLocaleString()} gal</td>
                    <td style={{ padding: "0.75rem 0.8rem", color: "#34d399" }}>{s.carbonKgYr.toLocaleString()} kg/yr</td>
                    <td style={{ padding: "0.75rem 0.8rem", color: "#38bdf8" }}>{s.energySavedKwh.toLocaleString()} kWh/yr</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
