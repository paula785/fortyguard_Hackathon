"use client";
// ─── Irrigation Water Dashboard Studio ────────────────────────────────────────

import { useAppStore } from "@/store/app-store";
import { WATERING_WINDOWS, calculateIrrigation } from "@/lib/irrigation/water-calculator";

export default function WaterDashboard() {
  const {
    city,
    interventions,
    irrigationPlan,
    setIrrigationPlan,
    preferences,
    setPreferences,
  } = useAppStore();

  const handleToggleDrought = () => {
    const isDrought = !irrigationPlan?.droughtMode;
    if (interventions.length > 0) {
      const updated = calculateIrrigation(
        interventions,
        null,
        isDrought
      );
      setIrrigationPlan(updated);
    }
    setPreferences({ mode: isDrought ? "low_water" : "balanced" });
  };

  if (!irrigationPlan || interventions.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-2xl) var(--space-md)",
          textAlign: "center",
          gap: "var(--space-md)",
          height: "100%",
        }}
      >
        <div style={{ fontSize: "3.5rem", filter: "drop-shadow(0 0 15px rgba(6,182,212,0.4))" }}>💧</div>
        <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)" }}>
          Smart Irrigation Telemetry for {city}
        </div>
        <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", maxWidth: 420, lineHeight: 1.6 }}>
          Run the Canopy Optimizer to calculate localized diurnal watering schedules, pre-dawn evapotranspiration windows, and drought-mode savings.
        </div>
      </div>
    );
  }

  const maxGallons = Math.max(...irrigationPlan.plants.map((p) => p.dailyGallons), 1);

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "var(--space-lg)", display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      {/* Top Banner */}
      <div
        className="glass-panel"
        style={{
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-md) var(--space-lg)",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)" }}>
            💧 Smart Diurnal Irrigation & Plant Health Studio
          </div>
          <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
            Telemetry Zone: <strong style={{ color: "#34d399" }}>{city}</strong> ({irrigationPlan.plants.length} Monitored Trees)
          </div>
        </div>

        <button
          onClick={handleToggleDrought}
          style={{
            padding: "0.55rem 1.1rem",
            background: irrigationPlan.droughtMode ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.15)",
            border: `1px solid ${irrigationPlan.droughtMode ? "rgba(239, 68, 68, 0.5)" : "var(--border-accent)"}`,
            borderRadius: "var(--radius-md)",
            color: irrigationPlan.droughtMode ? "#fca5a5" : "#34d399",
            fontWeight: 700,
            fontSize: "0.8rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          {irrigationPlan.droughtMode ? "🚨 Drought Mode: ACTIVE (28% Cut)" : "💧 Standard Water Budget"}
        </button>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-md)" }}>
        <div className="glass-card" style={{ padding: "var(--space-md)" }}>
          <div className="kpi-label">Daily Water Consumption</div>
          <div className="kpi-val" style={{ color: "#06b6d4" }}>
            {irrigationPlan.totalDailyGallons.toFixed(0)} <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Gal / Day</span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            {irrigationPlan.totalWeeklyGallons.toLocaleString()} gal/week aggregated
          </div>
        </div>

        <div className="glass-card" style={{ padding: "var(--space-md)" }}>
          <div className="kpi-label">Smart Evaporative Savings</div>
          <div className="kpi-val" style={{ color: "#34d399" }}>
            {irrigationPlan.savedVsStaticGallons.toLocaleString()} <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Gal / Wk</span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "#34d399", marginTop: "0.25rem" }}>
            ~34% reduction vs. legacy fixed timer systems
          </div>
        </div>

        <div className="glass-card" style={{ padding: "var(--space-md)" }}>
          <div className="kpi-label">Recommended Watering Window</div>
          <div className="kpi-val" style={{ color: "var(--accent-gold-bright)", fontSize: "1.25rem" }}>
            🌙 4:00 AM – 6:00 AM
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            Pre-dawn schedule minimizes vapor pressure deficit
          </div>
        </div>
      </div>

      {/* Diurnal Schedule & Evaporative Physics Card */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--space-md)" }}>
        <div className="glass-card" style={{ padding: "var(--space-lg)" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent-green-bright)", marginBottom: "1rem" }}>
            ⏰ Diurnal Watering Windows & Efficiency
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {WATERING_WINDOWS.map((w, i) => (
              <div
                key={w.label}
                className="stat-row"
                style={{
                  padding: "0.6rem 0.75rem",
                  background: i === 0 ? "rgba(16, 185, 129, 0.12)" : "rgba(255, 255, 255, 0.02)",
                  borderRadius: "var(--radius-sm)",
                  border: i === 0 ? "1px solid var(--border-accent)" : "1px solid transparent",
                }}
              >
                <div>
                  <span style={{ fontWeight: 700, color: i === 0 ? "#34d399" : "var(--text-primary)" }}>
                    {i === 0 ? "⭐ " : ""}{w.label}
                  </span>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                    {w.timeRange || `${w.startHour}:00 – ${w.endHour}:00`}
                  </div>
                </div>
                <span className="pill" style={{ background: i === 0 ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.08)", color: i === 0 ? "#34d399" : "var(--text-secondary)" }}>
                  {i === 0 ? "Recommended (Top Efficiency)" : "Alternative Window"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Per-Plant Meter Bars */}
        <div className="glass-card" style={{ padding: "var(--space-lg)" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent-green-bright)", marginBottom: "1rem" }}>
            📊 Per-Tree Diurnal Water Requirements
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {irrigationPlan.plants.slice(0, 8).map((plant, idx) => {
              const pct = (plant.dailyGallons / maxGallons) * 100;
              return (
                <div key={plant.plantId || idx}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      🌳 {plant.plantName}
                    </span>
                    <span style={{ color: "#06b6d4", fontWeight: 700 }}>
                      {plant.dailyGallons} gal/day
                    </span>
                  </div>
                  <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: "linear-gradient(90deg, #10b981 0%, #06b6d4 100%)",
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
