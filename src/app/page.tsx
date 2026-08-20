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
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        background: "var(--bg-primary)",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          border: "3px solid #34d399",
          borderTopColor: "transparent",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
      <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
        Loading high-resolution map engine...
      </span>
    </div>
  ),
});

// ── City presets ───────────────────────────────────────────────────────────
const CITY_PRESETS = [
  { name: "Phoenix, AZ", lat: 33.4484, lon: -112.074, tag: "Hot Desert" },
  { name: "Houston, TX", lat: 29.7604, lon: -95.3698, tag: "Humid Subtropical" },
  { name: "Miami, FL", lat: 25.7617, lon: -80.1918, tag: "Tropical Monsoon" },
  { name: "Las Vegas, NV", lat: 36.1699, lon: -115.1398, tag: "Arid Urban" },
  { name: "Los Angeles, CA", lat: 34.0522, lon: -118.2437, tag: "Mediterranean" },
];

const RIGHT_TABS: { id: RightTab; label: string; emoji: string }[] = [
  { id: "kpi", label: "KPIs", emoji: "📊" },
  { id: "irrigation", label: "Water", emoji: "💧" },
  { id: "export", label: "Export", emoji: "📄" },
];

function formatBudget(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val}`;
}

// ── Left Sidebar (Planning Brief & Controls) ─────────────────────────────────
function LeftSidebar() {
  const {
    city,
    lat,
    lon,
    budget,
    preferences,
    setCity,
    setLatLon,
    setBudget,
    setPreferences,
    agentSteps,
    isAgentRunning,
    addChatMessage,
    clearAgentSteps,
    setAgentRunning,
    setHeatmapBefore,
    setHeatmapAfter,
    setHotspots,
    setInterventions,
    setTemperatureStats,
    setIrrigationPlan,
    setKPIs,
  } = useAppStore();

  const [showPresets, setShowPresets] = useState(false);

  const runQuickAudit = async () => {
    if (isAgentRunning) return;
    const brief = `Run microclimate thermal audit for ${city} with priority ${preferences.mode}`;
    addChatMessage({ role: "user", content: brief });
    clearAgentSteps();
    setAgentRunning(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief,
          city,
          lat,
          lon,
          budget,
          mode: preferences.mode,
        }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let lastAssistantMsg = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const step = JSON.parse(line.slice(6));
            useAppStore.getState().addAgentStep(step);

            if (step.type === "message" && step.message !== lastAssistantMsg) {
              lastAssistantMsg = step.message;
              addChatMessage({ role: "assistant", content: step.message, data: step.data });
            }

            if (step.type === "complete") {
              addChatMessage({ role: "system", content: step.message });
            }

            if (step.type === "tool_result" && step.data) {
              const data = step.data as Record<string, unknown>;
              if (data.data && (data.data as Record<string, unknown>).map_data) {
                setHeatmapBefore(data.data as Parameters<typeof setHeatmapBefore>[0]);
              }
              if (data.afterGeoJSON) {
                setHeatmapAfter(data.afterGeoJSON as Parameters<typeof setHeatmapAfter>[0]);
              }
              if (data.hotspots) {
                setHotspots(data.hotspots as Parameters<typeof setHotspots>[0]);
              }
              if (data.placements) {
                setInterventions(data.placements as Parameters<typeof setInterventions>[0]);
              }
              if (data.stats && (data.stats as Record<string, unknown>).avgDeltaF !== undefined) {
                setTemperatureStats(data.stats as Parameters<typeof setTemperatureStats>[0]);
              }
              if (data.plan) {
                setIrrigationPlan(data.plan as Parameters<typeof setIrrigationPlan>[0]);
              }
              if (data.kpis) {
                setKPIs(data.kpis as Parameters<typeof setKPIs>[0]);
              }
            }
          } catch {
            // Ignore
          }
        }
      }
    } catch (err: unknown) {
      addChatMessage({
        role: "system",
        content: `Error running agent: ${(err as Error).message}`,
      });
    } finally {
      setAgentRunning(false);
    }
  };

  return (
    <div className="sidebar-left">
      {/* Config header */}
      <div className="panel-header">
        <span className="panel-title">🌿 Planning Brief</span>
        {isAgentRunning && (
          <div className="pill pill-live" style={{ fontSize: "0.68rem" }}>
            Audit In Progress
          </div>
        )}
      </div>

      <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
        {/* City selector */}
        <div>
          <label className="form-label">📍 Target City</label>
          <div style={{ position: "relative" }}>
            <button
              className="select-input"
              style={{
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontWeight: 600,
              }}
              onClick={() => setShowPresets(!showPresets)}
            >
              <span>{city}</span>
              <span style={{ color: "var(--accent-green-bright)" }}>▾</span>
            </button>
            {showPresets && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  right: 0,
                  background: "rgba(6, 21, 16, 0.98)",
                  border: "1px solid var(--border-accent)",
                  borderRadius: "var(--radius-md)",
                  zIndex: 100,
                  overflow: "hidden",
                  boxShadow: "var(--shadow-lg)",
                }}
              >
                {CITY_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    style={{
                      width: "100%",
                      padding: "0.65rem 1rem",
                      background: "transparent",
                      border: "none",
                      textAlign: "left",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(16, 185, 129, 0.15)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    onClick={() => {
                      setCity(preset.name);
                      setLatLon(preset.lat, preset.lon);
                      setShowPresets(false);
                    }}
                  >
                    <span>{preset.name}</span>
                    <span style={{ fontSize: "0.65rem", color: "var(--accent-green-bright)", opacity: 0.8 }}>
                      {preset.tag}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
            Coordinates: {lat.toFixed(4)}, {lon.toFixed(4)}
          </div>
        </div>

        {/* Budget slider */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
            <label className="form-label" style={{ margin: 0 }}>💰 Budget Cap</label>
            <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--accent-gold-bright)" }}>
              {formatBudget(budget)}
            </span>
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
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
            <span>$10K (Parcel)</span>
            <span>$2M (District)</span>
          </div>
        </div>

        {/* Priority mode */}
        <div>
          <label className="form-label">🎯 Priority Strategy</label>
          <div className="priority-grid">
            {(["balanced", "max_cooling", "low_water", "fast_shade"] as const).map((mode) => (
              <button
                key={mode}
                className={`priority-btn ${preferences.mode === mode ? "active" : ""}`}
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

        {/* 1-Click Launch Button */}
        <div>
          <button
            className="btn-primary"
            onClick={runQuickAudit}
            disabled={isAgentRunning}
            style={{ width: "100%", opacity: isAgentRunning ? 0.6 : 1 }}
          >
            {isAgentRunning ? "⏳ Optimizing Canopy..." : "⚡ Run Microclimate Audit"}
          </button>
        </div>

        {/* Agent progress list */}
        {agentSteps.length > 0 && (
          <div>
            <label className="form-label">📋 Agent Pipeline</label>
            <div
              style={{
                background: "rgba(6, 21, 16, 0.6)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
              }}
            >
              {agentSteps
                .filter((s) => s.type === "progress" || s.type === "tool_result" || s.type === "complete")
                .slice(-5)
                .map((step, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.4rem 0.65rem",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      fontSize: "0.72rem",
                    }}
                  >
                    <span>
                      {step.type === "complete" ? "✅" : step.type === "tool_result" ? "🌱" : "⚙️"}
                    </span>
                    <span style={{ color: "var(--text-secondary)", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {step.message}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Assistant Chat Panel */}
      <div style={{ borderTop: "1px solid var(--border-medium)", flex: 1, minHeight: 260, display: "flex", flexDirection: "column" }}>
        <div className="panel-header">
          <span className="panel-title">🤖 AI Assistant & Planner</span>
        </div>
        <AgentChat />
      </div>
    </div>
  );
}

// ── Right Sidebar ──────────────────────────────────────────────────────────
function RightSidebar() {
  const { rightTab, setRightTab } = useAppStore();

  return (
    <div className="sidebar-right">
      <div className="tabs">
        {RIGHT_TABS.map((tab) => (
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

// ── Main Shell ─────────────────────────────────────────────────────────────
export default function Home() {
  const { city, heatmapBefore, interventions } = useAppStore();

  return (
    <div className="app-shell">
      {/* Top Header */}
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon">🌳</div>
          <div>
            <div className="logo-name">UrbanCanopy AI</div>
            <div className="logo-sub">Microclimate Planning Assistant</div>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Status Indicators */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {heatmapBefore && (
            <div className="pill pill-live">
              🌡️ FortyGuard Thermal Data Loaded
            </div>
          )}
          {interventions.length > 0 && (
            <div className="pill" style={{ background: "rgba(16,185,129,0.18)", color: "#34d399", border: "1px solid rgba(52,211,153,0.4)" }}>
              🌳 {interventions.length} Interventions
            </div>
          )}
          <div className="pill pill-live">
            ● FortyGuard API Active
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginLeft: "1rem" }}>
          <a
            href="https://docs-api.fortyguard.com"
            target="_blank"
            rel="noopener"
            style={{
              padding: "0.3rem 0.75rem",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid var(--border-medium)",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.75rem",
              color: "var(--text-secondary)",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            📖 API Docs
          </a>
          <div className="pill pill-gold">
            Hackathon '26
          </div>
        </div>
      </header>

      {/* 3-Panel Main Layout */}
      <div className="app-body">
        <LeftSidebar />

        {/* Center Map View */}
        <main className="map-center">
          <HeatMap />

          {/* Central Overlay Prompt when no data */}
          {!heatmapBefore && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                textAlign: "center",
                pointerEvents: "none",
                zIndex: 5,
              }}
            >
              <div style={{ fontSize: "3rem", marginBottom: "0.5rem", filter: "drop-shadow(0 0 15px rgba(52,211,153,0.5))" }}>
                🌿
              </div>
              <div
                style={{
                  background: "rgba(6, 21, 16, 0.92)",
                  border: "1px solid var(--border-accent)",
                  borderRadius: "var(--radius-lg)",
                  padding: "1.25rem 2rem",
                  backdropFilter: "blur(16px)",
                  boxShadow: "var(--shadow-lg)",
                }}
              >
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
                  Ready to Plan {city}
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                  Click <strong style={{ color: "#34d399" }}>"Run Microclimate Audit"</strong> to fetch live FortyGuard thermal data
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
