"use client";
// ─── UrbanCanopy AI — Modular Tabbed Workspace Architecture ──────────────────

import dynamic from "next/dynamic";
import { useState } from "react";
import { useAppStore, MainTab } from "@/store/app-store";
import AgentChat from "@/components/Chat/AgentChat";
import OptimizerView from "@/components/Optimizer/OptimizerView";
import WaterDashboard from "@/components/Irrigation/WaterDashboard";
import BlueprintExport from "@/components/Report/BlueprintExport";

// Dynamically import MapLibre HeatMap
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
        Initializing FortyGuard Map Engine...
      </span>
    </div>
  ),
});

const MAIN_TABS: { id: MainTab; label: string; emoji: string; subtitle: string }[] = [
  { id: "heatmap", label: "Thermal Heatmap", emoji: "🗺️", subtitle: "FortyGuard Heat Audit" },
  { id: "optimizer", label: "Canopy & Shade", emoji: "🌳", subtitle: "Species & Structure Allocation" },
  { id: "irrigation", label: "Smart Irrigation", emoji: "💧", subtitle: "Diurnal Water Scheduling" },
  { id: "chat", label: "AI Planner", emoji: "🤖", subtitle: "LangGraph Conversational Agent" },
  { id: "export", label: "Blueprint Export", emoji: "📄", subtitle: "Grants, JSON & GIS CSV" },
];

const CITY_PRESETS = [
  { name: "Phoenix, AZ", lat: 33.4484, lon: -112.074, tag: "Hot Desert" },
  { name: "Houston, TX", lat: 29.7604, lon: -95.3698, tag: "Humid Subtropical" },
  { name: "Miami, FL", lat: 25.7617, lon: -80.1918, tag: "Tropical Monsoon" },
  { name: "Las Vegas, NV", lat: 36.1699, lon: -115.1398, tag: "Arid Urban" },
  { name: "Los Angeles, CA", lat: 34.0522, lon: -118.2437, tag: "Mediterranean" },
];

export default function Home() {
  const {
    city,
    lat,
    lon,
    setCity,
    setLatLon,
    activeMainTab,
    setActiveMainTab,
    heatmapBefore,
    interventions,
  } = useAppStore();

  const [showCityMenu, setShowCityMenu] = useState(false);

  return (
    <div className="app-shell">
      {/* ── Top Header Navigation Bar ───────────────────────────────────────── */}
      <header className="app-header">
        {/* Brand Logo */}
        <div className="logo" onClick={() => setActiveMainTab("heatmap")} style={{ cursor: "pointer" }}>
          <div className="logo-icon">🌳</div>
          <div>
            <div className="logo-name">UrbanCanopy AI</div>
            <div className="logo-sub">FortyGuard Planning Assistant</div>
          </div>
        </div>

        {/* Global City Dropdown Selector */}
        <div style={{ position: "relative", marginLeft: "1.5rem" }}>
          <button
            onClick={() => setShowCityMenu(!showCityMenu)}
            style={{
              padding: "0.4rem 0.85rem",
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid var(--border-medium)",
              borderRadius: "var(--radius-full)",
              color: "var(--text-primary)",
              fontSize: "0.8rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <span>📍 {city}</span>
            <span style={{ color: "#34d399", fontSize: "0.7rem" }}>▾</span>
          </button>

          {showCityMenu && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                background: "rgba(6, 21, 16, 0.98)",
                border: "1px solid var(--border-accent)",
                borderRadius: "var(--radius-md)",
                zIndex: 1000,
                minWidth: 200,
                boxShadow: "var(--shadow-lg)",
                overflow: "hidden",
              }}
            >
              {CITY_PRESETS.map((c) => (
                <button
                  key={c.name}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.9rem",
                    background: "transparent",
                    border: "none",
                    textAlign: "left",
                    color: "var(--text-primary)",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(16, 185, 129, 0.18)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  onClick={() => {
                    setCity(c.name);
                    setLatLon(c.lat, c.lon);
                    setShowCityMenu(false);
                  }}
                >
                  <span>{c.name}</span>
                  <span style={{ fontSize: "0.65rem", color: "var(--accent-green-bright)", opacity: 0.8 }}>
                    {c.tag}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Main Tab Navigation Items ─────────────────────────────────────── */}
        <nav style={{ display: "flex", gap: "0.35rem", marginLeft: "2rem" }}>
          {MAIN_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveMainTab(tab.id)}
              style={{
                padding: "0.45rem 0.9rem",
                background: activeMainTab === tab.id ? "rgba(16, 185, 129, 0.22)" : "transparent",
                border: activeMainTab === tab.id ? "1px solid var(--border-accent)" : "1px solid transparent",
                borderRadius: "var(--radius-md)",
                color: activeMainTab === tab.id ? "#34d399" : "var(--text-secondary)",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all var(--transition-fast)",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        {/* Status Indicators & Docs */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {heatmapBefore && (
            <div className="pill pill-live" style={{ fontSize: "0.7rem" }}>
              🌡️ Thermal Loaded
            </div>
          )}
          {interventions.length > 0 && (
            <div className="pill" style={{ background: "rgba(16,185,129,0.18)", color: "#34d399", border: "1px solid rgba(52,211,153,0.4)", fontSize: "0.7rem" }}>
              🌳 {interventions.length} Interventions
            </div>
          )}
          <div className="pill pill-live" style={{ fontSize: "0.7rem" }}>
            ● FortyGuard Live
          </div>
          <div className="pill pill-gold" style={{ fontSize: "0.7rem" }}>
            Hackathon '26
          </div>
        </div>
      </header>

      {/* ── Main Workspace Body (Renders Active Tab) ────────────────────────── */}
      <main style={{ flex: 1, position: "relative", overflow: "hidden", background: "var(--bg-primary)" }}>
        {/* Tab 1: Thermal Heatmap Studio */}
        {activeMainTab === "heatmap" && (
          <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <HeatMap />
          </div>
        )}

        {/* Tab 2: Canopy & Shade Optimizer */}
        {activeMainTab === "optimizer" && (
          <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <OptimizerView />
          </div>
        )}

        {/* Tab 3: Smart Irrigation Studio */}
        {activeMainTab === "irrigation" && (
          <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <WaterDashboard />
          </div>
        )}

        {/* Tab 4: LangGraph AI Assistant */}
        {activeMainTab === "chat" && (
          <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <AgentChat isFullView={true} />
          </div>
        )}

        {/* Tab 5: Municipal Blueprint & Grants */}
        {activeMainTab === "export" && (
          <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <BlueprintExport />
          </div>
        )}
      </main>
    </div>
  );
}
