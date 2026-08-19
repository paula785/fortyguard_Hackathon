"use client";
// ─── UrbanCanopy AI — Main Dashboard ──────────────────────────────────────────

import dynamic from "next/dynamic";
import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import AgentChat from "@/components/Chat/AgentChat";
import KPIPanel from "@/components/Dashboard/KPIPanel";
import WaterDashboard from "@/components/Irrigation/WaterDashboard";
import BlueprintExport from "@/components/Report/BlueprintExport";
import type { RightTab } from "@/store/app-store";

// Dynamically import map (client-only, maplibre-gl needs window)
const HeatMap = dynamic(() => import("@/components/Map/HeatMap"), {
  ssr: false,
  loading: () => (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: "1rem", background: "var(--bg-primary)",
    }}>
      <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading map engine...</span>
    </div>
  ),
});

// ── City presets ───────────────────────────────────────────────────────────
const CITY_PRESETS = [
  { name: "Phoenix, AZ", lat: 33.4484, lon: -112.074 },
  { name: "Houston, TX", lat: 29.7604, lon: -95.3698 },
  { name: "Miami, FL", lat: 25.7617, lon: -80.1918 },
  { name: "Las Vegas, NV", lat: 36.1699, lon: -115.1398 },
  { name: "Los Angeles, CA", lat: 34.0522, lon: -118.2437 },
  { name: "New York, NY", lat: 40.7128, lon: -74.006 },
];

const RIGHT_TABS: { id: RightTab; label: string; emoji: string }[] = [
  { id: "kpi", label: "KPIs", emoji: "📊" },
  { id: "irrigation", label: "Water", emoji: "💧" },
  { id: "export", label: "Export", emoji: "📄" },
];

// ── Budget formatter ───────────────────────────────────────────────────────
function formatBudget(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val}`;
}

// ── Left sidebar ───────────────────────────────────────────────────────────
function LeftSidebar() {
  const {
    city, lat, lon, budget, preferences,
    setCity, setLatLon, setBudget, setPreferences,
    agentSteps, isAgentRunning,
  } = useAppStore();

  const [showPresets, setShowPresets] = useState(false);

  return (
    <div className="sidebar-left">
      {/* Config header */}
      <div className="panel-header">
        <span className="panel-title">Planning Brief</span>
        {isAgentRunning && (
          <div className="pill pill-processing">
            <div className="spinner" style={{ width: 8, height: 8, borderWidth: 1 }} />
            &nbsp;Running
          </div>
        )}
      </div>

      <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
        {/* City selector */}
        <div>
          <label className="input-label">Target City</label>
          <div style={{ position: "relative" }}>
            <button
              className="input"
              style={{
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
              onClick={() => setShowPresets(!showPresets)}
            >
              <span>{city}</span>
              <span style={{ color: "var(--text-muted)" }}>▾</span>
            </button>
            {showPresets && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-medium)",
                borderRadius: "var(--radius-md)",
                zIndex: 100,
                overflow: "hidden",
              }}>
                {CITY_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    style={{
                      width: "100%",
                      padding: "0.6rem 1rem",
                      background: "transparent",
                      border: "none",
                      textAlign: "left",
                      color: "var(--text-secondary)",
                      fontSize: "0.875rem",
                      cursor: "pointer",
                      transition: "background var(--transition-fast)",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    onClick={() => {
                      setCity(preset.name);
                      setLatLon(preset.lat, preset.lon);
                      setShowPresets(false);
                    }}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
            {lat.toFixed(4)}, {lon.toFixed(4)}
          </div>
        </div>

        {/* Budget slider */}
        <div>
          <label className="input-label">Budget Cap</label>
          <div className="budget-display">
            <div className="budget-amount">{formatBudget(budget)}</div>
          </div>
          <input
            type="range"
            min={10000}
            max={2000000}
            step={10000}
            value={budget}
            onChange={e => setBudget(Number(e.target.value))}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
            <span>$10K</span>
            <span>$2M</span>
          </div>
        </div>

        {/* Priority mode */}
        <div>
          <label className="input-label">Priority Mode</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
            {(["balanced", "max_cooling", "low_water", "fast_shade"] as const).map(mode => (
              <button
                key={mode}
                className={preferences.mode === mode ? "btn btn-primary" : "btn btn-secondary"}
                style={{ fontSize: "0.72rem", padding: "0.4rem 0.5rem", justifyContent: "center" }}
                onClick={() => setPreferences({ mode })}
              >
                {mode === "balanced" ? "⚖️ Balanced" :
                 mode === "max_cooling" ? "🌡️ Max Cool" :
                 mode === "low_water" ? "💧 Low Water" : "⚡ Fast Shade"}
              </button>
            ))}
          </div>
        </div>

        {/* Agent progress steps */}
        {agentSteps.length > 0 && (
          <div>
            <label className="input-label">Agent Progress</label>
            <div style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
            }}>
              {agentSteps
                .filter(s => s.type === "progress" || s.type === "tool_result" || s.type === "complete")
                .slice(-6)
                .map((step, i) => (
                  <div key={i} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.45rem 0.75rem",
                    borderBottom: "1px solid var(--border-subtle)",
                    fontSize: "0.75rem",
                  }}>
                    <span style={{
                      color: step.type === "complete" ? "#4ade80" :
                             step.type === "tool_result" ? "var(--accent-teal)" :
                             "var(--text-muted)",
                    }}>
                      {step.type === "complete" ? "✅" :
                       step.type === "tool_result" ? "✓" : "◦"}
                    </span>
                    <span style={{ color: "var(--text-secondary)", lineHeight: 1.3 }}>
                      {step.message.slice(0, 60)}{step.message.length > 60 ? "…" : ""}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Chat section */}
      <div className="divider" style={{ margin: 0 }} />
      <div style={{ height: "clamp(280px, 40vh, 420px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div className="panel-header" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <span className="panel-title">AI Assistant</span>
        </div>
        <AgentChat />
      </div>
    </div>
  );
}

// ── Right sidebar ──────────────────────────────────────────────────────────
function RightSidebar() {
  const { rightTab, setRightTab } = useAppStore();

  return (
    <div className="sidebar-right">
      <div className="tabs">
        {RIGHT_TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${rightTab === tab.id ? "active" : ""}`}
            onClick={() => setRightTab(tab.id)}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {rightTab === "kpi" && <KPIPanel />}
        {rightTab === "irrigation" && <WaterDashboard />}
        {rightTab === "export" && <BlueprintExport />}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function Home() {
  const { city, heatmapBefore, interventions } = useAppStore();

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon">🌳</div>
          <div>
            <div className="logo-name">UrbanCanopy AI</div>
            <div className="logo-sub">Microclimate Planning Assistant</div>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Status pills */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {heatmapBefore && (
            <div className="pill pill-live">
              🌡️ Thermal Data Loaded
            </div>
          )}
          {interventions.length > 0 && (
            <div className="pill" style={{ background: "rgba(39,174,96,0.15)", color: "#4ade80" }}>
              🌳 {interventions.length} Interventions
            </div>
          )}
          <div className="pill pill-live">
            ● FortyGuard API
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <a
            href="https://docs-api.fortyguard.com"
            target="_blank"
            rel="noopener"
            className="btn btn-ghost"
            style={{ fontSize: "0.75rem" }}
          >
            API Docs
          </a>
          <div style={{
            padding: "0.3rem 0.75rem",
            background: "var(--accent-gold-dim)",
            border: "1px solid rgba(255,218,0,0.3)",
            borderRadius: "var(--radius-full)",
            fontSize: "0.72rem",
            fontWeight: 700,
            color: "var(--accent-gold)",
          }}>
            Hackathon '26
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="app-body">
        <LeftSidebar />

        {/* Map */}
        <main className="map-center">
          <HeatMap />

          {/* Center overlay when empty */}
          {!heatmapBefore && (
            <div style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              pointerEvents: "none",
              zIndex: 5,
            }}>
              <div style={{ fontSize: "3rem", marginBottom: "0.75rem", opacity: 0.8 }}>🌡️</div>
              <div style={{
                background: "rgba(4,9,28,0.85)",
                border: "1px solid var(--border-medium)",
                borderRadius: "var(--radius-lg)",
                padding: "1.25rem 1.75rem",
                backdropFilter: "blur(12px)",
              }}>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.4rem" }}>
                  Ready to Analyze {city}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Ask the AI assistant to start the thermal audit
                </div>
              </div>
            </div>
          )}
        </main>

        <RightSidebar />
      </div>
    </div>
  );
}
