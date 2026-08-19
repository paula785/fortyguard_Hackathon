"use client";
// ─── KPI Dashboard Panel ──────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useAppStore } from "@/store/app-store";

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  color?: string;
}

function AnimatedNumber({ value, decimals = 1, prefix = "", suffix = "", color }: AnimatedNumberProps) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const start = 0;
    const duration = 800;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(start + (value - start) * eased);
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <span style={color ? { color } : {}}>
      {prefix}{displayed.toFixed(decimals)}{suffix}
    </span>
  );
}

export default function KPIPanel() {
  const { kpis, temperatureStats, interventions, budget, heatmapBefore } = useAppStore();

  const hasData = !!kpis || !!temperatureStats;

  const stats = heatmapBefore?.stats_data.temperature_stats;

  return (
    <div style={{ padding: "var(--space-md)", display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>

      {/* Temperature Stats (always visible if heatmap loaded) */}
      {stats && (
        <div className="glass-card" style={{ padding: "var(--space-md)" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--accent-blue-light)", marginBottom: "0.75rem" }}>
            Current Thermal Profile
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#e0713c" }}>
                <AnimatedNumber value={(stats.maximum * 9/5) + 32} decimals={0} suffix="°F" color="#e0713c" />
              </div>
              <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Peak Temp</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent-teal)" }}>
                <AnimatedNumber value={(stats.mean * 9/5) + 32} decimals={0} suffix="°F" color="var(--accent-teal)" />
              </div>
              <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Avg Temp</div>
            </div>
          </div>
        </div>
      )}

      {/* Main KPIs */}
      {hasData ? (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-value" style={{ color: "#4ade80" }}>
                <AnimatedNumber
                  value={kpis?.coolingEfficacyF ?? temperatureStats?.avgDeltaF ?? 0}
                  prefix="−"
                  suffix="°F"
                  color="#4ade80"
                />
              </div>
              <div className="kpi-label">Avg Cooling</div>
              <div className="kpi-delta positive">
                {kpis && temperatureStats
                  ? `${temperatureStats.avgBeforeF}→${temperatureStats.avgAfterF}°F`
                  : "projected"}
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-value" style={{ color: "var(--accent-gold)" }}>
                <AnimatedNumber
                  value={kpis?.budgetEfficiencyDollarPerDegree ?? 0}
                  decimals={0}
                  prefix="$"
                  suffix="/°F"
                  color="var(--accent-gold)"
                />
              </div>
              <div className="kpi-label">Cost/Degree</div>
              <div className="kpi-delta positive">budget efficiency</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-value" style={{ color: "var(--accent-teal)" }}>
                <AnimatedNumber
                  value={kpis?.waterSavedGallonsPerWeek ?? 0}
                  decimals={0}
                  suffix=" gal"
                  color="var(--accent-teal)"
                />
              </div>
              <div className="kpi-label">Water Saved/wk</div>
              <div className="kpi-delta positive">vs static timers</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-value" style={{ color: "#a78bfa" }}>
                <AnimatedNumber
                  value={kpis?.assetCoveragePercent ?? temperatureStats?.areaImprovedPercent ?? 0}
                  suffix="%"
                  color="#a78bfa"
                />
              </div>
              <div className="kpi-label">Area Improved</div>
              <div className="kpi-delta positive">shade coverage</div>
            </div>
          </div>

          {/* Intervention summary */}
          {interventions.length > 0 && (
            <div className="glass-card" style={{ padding: "var(--space-md)" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--accent-blue-light)", marginBottom: "0.75rem" }}>
                Intervention Summary
              </div>
              <div className="stat-row">
                <span className="stat-key">Total Items</span>
                <span className="stat-val">{interventions.length}</span>
              </div>
              <div className="stat-row">
                <span className="stat-key">Trees</span>
                <span className="stat-val" style={{ color: "#4ade80" }}>
                  {interventions.filter(i => i.type === "tree").length} 🌳
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-key">Shade Structures</span>
                <span className="stat-val" style={{ color: "var(--accent-teal)" }}>
                  {interventions.filter(i => i.type === "shade_structure").length} ⛵
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-key">Total Cost</span>
                <span className="stat-val" style={{ color: "var(--accent-gold)" }}>
                  ${kpis?.totalBudgetUsed.toLocaleString() ?? interventions.reduce((s, i) => s + i.cost, 0).toLocaleString()}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-key">Budget Used</span>
                <span className="stat-val">
                  {((( kpis?.totalBudgetUsed ?? interventions.reduce((s, i) => s + i.cost, 0)) / budget) * 100).toFixed(0)}%
                </span>
              </div>
              {kpis?.treeSurvivalRatePercent && (
                <div className="stat-row">
                  <span className="stat-key">Tree Survival Rate</span>
                  <span className="stat-val" style={{ color: "#4ade80" }}>
                    {kpis.treeSurvivalRatePercent}%
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Max cooling highlight */}
          {temperatureStats && (
            <div style={{
              background: "linear-gradient(135deg, rgba(39,174,96,0.15), rgba(15,134,161,0.15))",
              border: "1px solid rgba(39,174,96,0.3)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-md)",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "#4ade80" }}>
                <AnimatedNumber value={temperatureStats.maxDeltaF} prefix="−" suffix="°F" color="#4ade80" />
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                Maximum cooling achieved in hottest corridor
              </div>
            </div>
          )}
        </>
      ) : (
        /* Empty state */
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--space-md)",
          padding: "var(--space-2xl) var(--space-md)",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "3rem" }}>📊</div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.6, maxWidth: 220 }}>
            KPIs will appear here once the agent analyzes the area and runs the simulation.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%" }}>
            {[
              { label: "Cooling Efficacy", value: "−", unit: "°F avg" },
              { label: "Budget Efficiency", value: "−", unit: "$/°F" },
              { label: "Water Savings", value: "−", unit: "gal/wk" },
            ].map(item => (
              <div key={item.label} className="kpi-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="kpi-label">{item.label}</span>
                <span style={{ color: "var(--text-muted)", fontWeight: 700 }}>{item.value} {item.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
