"use client";
// ─── Irrigation Water Dashboard ───────────────────────────────────────────────

import { useAppStore } from "@/store/app-store";
import { WATERING_WINDOWS } from "@/lib/irrigation/water-calculator";

export default function WaterDashboard() {
  const { irrigationPlan } = useAppStore();

  if (!irrigationPlan) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-2xl) var(--space-md)",
        textAlign: "center",
        gap: "var(--space-md)",
      }}>
        <div style={{ fontSize: "3rem" }}>💧</div>
        <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.6 }}>
          Irrigation schedules appear after the agent completes tree placement optimization.
        </div>
      </div>
    );
  }

  const maxGallons = Math.max(...irrigationPlan.plants.map(p => p.dailyGallons), 1);

  return (
    <div style={{ padding: "var(--space-md)", display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
        <div className="kpi-card">
          <div className="kpi-value" style={{ color: "var(--accent-teal)", fontSize: "1.5rem" }}>
            {irrigationPlan.totalDailyGallons.toFixed(0)}
          </div>
          <div className="kpi-label">Gal / Day</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value" style={{ color: "#4ade80", fontSize: "1.5rem" }}>
            {irrigationPlan.savedVsStaticGallons.toLocaleString()}
          </div>
          <div className="kpi-label">Saved / Week</div>
        </div>
      </div>

      {/* Drought mode alert */}
      {irrigationPlan.droughtMode && (
        <div style={{
          background: "rgba(201, 75, 30, 0.12)",
          border: "1px solid rgba(201, 75, 30, 0.4)",
          borderRadius: "var(--radius-md)",
          padding: "0.75rem",
          fontSize: "0.8rem",
          color: "#e0713c",
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
        }}>
          ⚠️ <strong>Drought Mode Active</strong> — 28% water reduction applied. Survival threshold maintained.
        </div>
      )}

      {/* Optimal window */}
      <div className="glass-card" style={{ padding: "var(--space-md)" }}>
        <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--accent-blue-light)", marginBottom: "0.75rem" }}>
          Optimal Watering Windows
        </div>
        {WATERING_WINDOWS.map((w, i) => (
          <div
            key={w.label}
            className="stat-row"
            style={{
              color: i === 0 ? "#4ade80" : "var(--text-secondary)",
            }}
          >
            <span className="stat-key">{i === 0 ? "⭐" : " "} {w.label}</span>
            <span className="stat-val" style={{ fontSize: "0.7rem" }}>
              {i === 0 ? "Recommended" : "Alternative"}
            </span>
          </div>
        ))}
        <div style={{ marginTop: "0.5rem", fontSize: "0.7rem", color: "var(--text-muted)", fontStyle: "italic" }}>
          Pre-dawn watering reduces evaporative loss by up to 40% vs midday
        </div>
      </div>

      {/* Per-plant breakdown */}
      <div className="glass-card" style={{ padding: "var(--space-md)" }}>
        <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--accent-blue-light)", marginBottom: "0.75rem" }}>
          Per-Plant Water Budget
        </div>
        <div className="irrigation-timeline">
          {irrigationPlan.plants.slice(0, 12).map((plant) => (
            <div key={plant.plantId} className="timeline-row">
              <div className="timeline-label" title={plant.plantName}>
                🌳 {plant.plantName.split(" ").slice(0, 2).join(" ")}
              </div>
              <div className="timeline-bar-bg">
                <div
                  className="timeline-bar-fill"
                  style={{ width: `${(plant.dailyGallons / maxGallons) * 100}%` }}
                />
              </div>
              <div className="timeline-value">{plant.dailyGallons} gal</div>
            </div>
          ))}
          {irrigationPlan.plants.length > 12 && (
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center", padding: "0.25rem 0" }}>
              +{irrigationPlan.plants.length - 12} more plants
            </div>
          )}
        </div>
      </div>

      {/* Weekly total */}
      <div style={{
        background: "linear-gradient(135deg, rgba(15,134,161,0.15), rgba(23,105,176,0.15))",
        border: "1px solid rgba(15,134,161,0.3)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-md)",
        textAlign: "center",
      }}>
        <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--accent-teal)" }}>
          {irrigationPlan.totalWeeklyGallons.toLocaleString()} gal
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
          Total weekly water budget for {irrigationPlan.plants.length} trees
        </div>
        <div style={{ fontSize: "0.75rem", color: "#4ade80", marginTop: "0.25rem" }}>
          Saves {irrigationPlan.savedVsStaticGallons.toLocaleString()} gal/week vs static timers
        </div>
      </div>
    </div>
  );
}
