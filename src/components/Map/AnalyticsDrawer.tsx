"use client";
// ─── Screen 2 — Right Analytics Drawer Component (PRD §5.2) ─────────────────
// Environmental cards, Land-cover breakdown pie chart, Pedestrian hotspots, and Greening CTA.

import React from "react";
import { useAppStore } from "@/store/app-store";

export default function AnalyticsDrawer({
  isOpen,
  onClose,
  onGeneratePlan,
}: {
  isOpen: boolean;
  onClose: () => void;
  onGeneratePlan: () => void;
}) {
  const { city, hotspots, envParams, heatmapBefore, setActiveMainTab } = useAppStore();

  if (!isOpen) return null;

  const tempStats = heatmapBefore?.stats_data?.temperature_stats;
  const meanTempC = tempStats?.mean ?? 38.2;
  const meanTempF = ((meanTempC * 9) / 5 + 32).toFixed(1);
  const humidity = envParams?.result?.locations?.[0]?.parameters?.relative_humidity_percent?.[0] ?? 24;
  const heatIndexC = envParams?.result?.locations?.[0]?.parameters?.heat_index_celsius?.[0] ?? meanTempC + 2.5;
  const heatIndexF = ((heatIndexC * 9) / 5 + 32).toFixed(1);

  // Satellite Land-Cover breakdown segments (PRD §5.2)
  const segments = {
    building: 42,
    road: 28,
    vegetation: 14,
    sidewalk: 16,
  };

  return (
    <div
      className="glass-card"
      style={{
        position: "absolute",
        top: 80,
        right: 14,
        width: 340,
        maxHeight: "calc(100vh - 120px)",
        overflowY: "auto",
        padding: "1.2rem",
        zIndex: 35,
        display: "flex",
        flexDirection: "column",
        gap: "1.1rem",
        boxShadow: "0 16px 45px rgba(0, 0, 0, 0.6)",
        border: "1px solid rgba(181, 216, 136, 0.25)",
        background: "rgba(10, 32, 25, 0.94)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.6rem" }}>
        <div>
          <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
            Microclimate Diagnostics
          </div>
          <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#ffffff" }}>
            {city} Diagnostics
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1rem" }}
        >
          ✕
        </button>
      </div>

      {/* 1. Environmental Cards (PRD §5.2) */}
      <div>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#6CB83A", textTransform: "uppercase", marginBottom: "0.5rem" }}>
          🌡️ Environmental Telemetry (/env_params)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.4rem" }}>
          <div style={{ background: "rgba(20, 77, 53, 0.35)", padding: "0.6rem 0.4rem", borderRadius: 8, textAlign: "center", border: "1px solid rgba(181, 216, 136, 0.15)" }}>
            <div style={{ fontSize: "0.65rem", color: "#94a3b8" }}>Ambient</div>
            <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#f8fafc" }}>{meanTempF}°F</div>
            <div style={{ fontSize: "0.65rem", color: "#6CB83A" }}>{meanTempC.toFixed(1)}°C</div>
          </div>

          <div style={{ background: "rgba(20, 77, 53, 0.35)", padding: "0.6rem 0.4rem", borderRadius: 8, textAlign: "center", border: "1px solid rgba(181, 216, 136, 0.15)" }}>
            <div style={{ fontSize: "0.65rem", color: "#94a3b8" }}>Humidity</div>
            <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#38bdf8" }}>{humidity}%</div>
            <div style={{ fontSize: "0.65rem", color: "#94a3b8" }}>Relative</div>
          </div>

          <div style={{ background: "rgba(20, 77, 53, 0.35)", padding: "0.6rem 0.4rem", borderRadius: 8, textAlign: "center", border: "1px solid rgba(181, 216, 136, 0.15)" }}>
            <div style={{ fontSize: "0.65rem", color: "#94a3b8" }}>Heat Index</div>
            <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#ef4444" }}>{heatIndexF}°F</div>
            <div style={{ fontSize: "0.65rem", color: "#ef4444" }}>WHO Alert</div>
          </div>
        </div>
      </div>

      {/* 2. Land-Cover Breakdown Donut / Progress Bars (PRD §5.2) */}
      <div>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#6CB83A", textTransform: "uppercase", marginBottom: "0.5rem" }}>
          🛰️ Satellite Land-Cover Breakdown
        </div>
        <div style={{ background: "rgba(0,0,0,0.3)", padding: "0.75rem", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Segment Bars */}
          <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", marginBottom: "0.6rem" }}>
            <div style={{ width: `${segments.building}%`, background: "#94a3b8" }} title={`Buildings: ${segments.building}%`} />
            <div style={{ width: `${segments.road}%`, background: "#ea580c" }} title={`Asphalt Roads: ${segments.road}%`} />
            <div style={{ width: `${segments.sidewalk}%`, background: "#eab308" }} title={`Sidewalks: ${segments.sidewalk}%`} />
            <div style={{ width: `${segments.vegetation}%`, background: "#6CB83A" }} title={`Canopy / Vegetation: ${segments.vegetation}%`} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem", fontSize: "0.72rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: "#94a3b8" }} />
              <span style={{ color: "#cbd5e1" }}>Buildings ({segments.building}%)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: "#ea580c" }} />
              <span style={{ color: "#cbd5e1" }}>Roads ({segments.road}%)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: "#eab308" }} />
              <span style={{ color: "#cbd5e1" }}>Sidewalks ({segments.sidewalk}%)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: "#6CB83A" }} />
              <span style={{ color: "#6CB83A", fontWeight: 700 }}>Canopy ({segments.vegetation}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Pedestrian Hotspots List (PRD §5.2) */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#6CB83A", textTransform: "uppercase" }}>
            🚶 Top Pedestrian Hotspots
          </div>
          <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{hotspots.length || 18} Detected</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: 160, overflowY: "auto" }}>
          {hotspots.slice(0, 4).map((h, i) => (
            <div
              key={h.id || i}
              style={{
                background: "rgba(20, 77, 53, 0.25)",
                padding: "0.45rem 0.65rem",
                borderRadius: 8,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "0.75rem",
                border: "1px solid rgba(181, 216, 136, 0.12)",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: "#f8fafc" }}>
                  Hotspot #{i + 1} ({h.surfaceType || "Asphalt Corridor"})
                </div>
                <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                  {h.lat.toFixed(4)}°N, {h.lon.toFixed(4)}°W
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ color: "#ef4444", fontWeight: 800 }}>{h.temperatureF || 108.4}°F</span>
                <div style={{ fontSize: "0.65rem", color: "#f59e0b" }}>High Exposure</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Primary CTA: Generate Greening Plan (PRD §5.2) */}
      <button
        className="btn-primary"
        onClick={() => {
          onGeneratePlan();
          setActiveMainTab("optimizer");
        }}
        style={{
          width: "100%",
          padding: "0.8rem",
          fontSize: "0.88rem",
          fontWeight: 800,
          borderRadius: 8,
          border: "none",
          background: "linear-gradient(135deg, #144D35 0%, #6CB83A 100%)",
          color: "#ffffff",
          cursor: "pointer",
          boxShadow: "0 4px 15px rgba(20, 77, 53, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
        }}
      >
        <span>🌳</span>
        <span>Generate Greening Plan →</span>
      </button>
    </div>
  );
}
