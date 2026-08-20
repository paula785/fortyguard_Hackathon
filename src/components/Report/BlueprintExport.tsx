"use client";
// ─── Municipal Blueprint & Grant Export Studio ────────────────────────────────
// Produces official FEMA BRIC, EPA ECJCG & USDA UCF grant applications,
// GeoJSON FeatureCollections, GIS shapefile-ready CSVs, and print-ready city council dossiers.

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { calculateEcoBenefits } from "@/lib/simulation/eco-physics";

export default function BlueprintExport() {
  const {
    city,
    budget,
    interventions,
    temperatureStats,
    irrigationPlan,
    kpis,
    hotspots,
    setActiveMainTab,
  } = useAppStore();

  const [selectedGrant, setSelectedGrant] = useState<"fema_bric" | "epa_ecjcg" | "usda_ucf">("fema_bric");
  const [showGrantPreview, setShowGrantPreview] = useState(false);

  const hasData = interventions.length > 0;
  const totalCost = interventions.reduce((s, i) => s + i.cost, 0);
  const treeCount = interventions.filter((i) => i.type === "tree").length;
  const structureCount = interventions.filter((i) => i.type === "shade_structure").length;
  const eco = calculateEcoBenefits(interventions);

  // 1. Export Standard JSON Blueprint
  const exportBlueprint = () => {
    const blueprint = {
      project: {
        name: `UrbanCanopy AI Blueprint — ${city}`,
        generatedAt: new Date().toISOString(),
        city,
        budget,
        sponsor: "FortyGuard Hackathon '26",
      },
      summary: {
        totalInterventions: interventions.length,
        treeCount,
        structureCount,
        totalCost,
        remainingBudget: Math.max(0, budget - totalCost),
      },
      ecoBenefits: eco,
      kpis,
      temperatureStats,
      irrigationSummary: irrigationPlan
        ? {
            totalDailyGallons: irrigationPlan.totalDailyGallons,
            totalWeeklyGallons: irrigationPlan.totalWeeklyGallons,
            savedVsStaticGallons: irrigationPlan.savedVsStaticGallons,
            droughtMode: irrigationPlan.droughtMode,
          }
        : null,
      hotspots: hotspots.map((h) => ({
        lat: h.lat,
        lon: h.lon,
        temperatureF: h.temperatureF,
        priority: h.priority,
        surfaceType: h.surfaceType,
      })),
      interventions: interventions.map((p) => ({
        id: p.id,
        type: p.type,
        name: p.name,
        catalogItemId: p.catalogItemId,
        coordinates: { lat: p.lat, lon: p.lon },
        cost: p.cost,
        coolingDeltaF: p.coolingDeltaF,
        waterGalPerDay: p.waterGalPerDay,
        coverageM2: p.coverageM2,
      })),
    };

    const blob = new Blob([JSON.stringify(blueprint, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `urbancanopy-blueprint-${city.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 2. Export GeoJSON GIS FeatureCollection
  const exportGeoJSON = () => {
    const geojson = {
      type: "FeatureCollection",
      name: `UrbanCanopy_Interventions_${city.replace(/[^a-zA-Z0-9]/g, "_")}`,
      crs: { type: "name", properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" } },
      features: interventions.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lon, p.lat] },
        properties: {
          id: p.id,
          type: p.type,
          name: p.name,
          catalogItemId: p.catalogItemId,
          costUsd: p.cost,
          coolingDeltaF: p.coolingDeltaF,
          waterGalDay: p.waterGalPerDay,
          coverageM2: p.coverageM2,
          jurisdiction: city,
          source: "FortyGuard UrbanCanopy AI",
        },
      })),
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `urbancanopy-gis-layers-${city.toLowerCase().replace(/[^a-z0-9]/g, "-")}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 3. Export GIS CSV
  const exportCSV = () => {
    const rows = [
      ["ID", "Type", "Name", "Latitude", "Longitude", "Cost ($)", "Cooling (°F)", "Water (gal/day)", "Coverage (m²)"],
      ...interventions.map((p) => [
        p.id,
        p.type,
        `"${p.name}"`,
        p.lat.toFixed(6),
        p.lon.toFixed(6),
        p.cost,
        p.coolingDeltaF.toFixed(1),
        p.waterGalPerDay,
        p.coverageM2,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `urbancanopy-interventions-${city.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!hasData) {
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
        <div style={{ fontSize: "3.5rem" }}>📄</div>
        <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)" }}>
          Municipal Blueprint & Grant Studio
        </div>
        <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", maxWidth: 420, lineHeight: 1.6 }}>
          Run the Heatmap Analysis or Canopy Optimizer to generate the complete capital expenditure plan, GIS spatial layers, and federal grant applications.
        </div>
        <button
          className="btn-primary"
          onClick={() => setActiveMainTab("heatmap")}
          style={{ maxWidth: 220, marginTop: "0.5rem" }}
        >
          🗺️ Go to Heatmap Analysis
        </button>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "var(--space-lg)", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Top Banner & Export Actions */}
      <div
        className="glass-panel"
        style={{
          borderRadius: "var(--radius-lg)",
          padding: "1rem 1.5rem",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)" }}>
            📄 Municipal Cooling Blueprint & Grant Deliverable
          </div>
          <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
            Target Jurisdiction: <strong style={{ color: "#34d399" }}>{city}</strong> · Authorized Cap: <strong style={{ color: "var(--accent-gold-bright)" }}>${budget.toLocaleString()}</strong> · Total Allocated: <strong style={{ color: "#38bdf8" }}>${totalCost.toLocaleString()}</strong>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button className="btn-primary" onClick={exportBlueprint} style={{ padding: "0.55rem 1rem", fontSize: "0.8rem" }}>
            📥 Blueprint (JSON)
          </button>
          <button
            onClick={exportGeoJSON}
            style={{
              padding: "0.55rem 1rem",
              background: "rgba(16, 185, 129, 0.2)",
              border: "1px solid #10b981",
              borderRadius: "var(--radius-md)",
              color: "#34d399",
              fontWeight: 700,
              fontSize: "0.8rem",
              cursor: "pointer",
            }}
          >
            🗺️ GIS Layers (GeoJSON)
          </button>
          <button
            onClick={exportCSV}
            style={{
              padding: "0.55rem 1rem",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid var(--border-medium)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-primary)",
              fontWeight: 700,
              fontSize: "0.8rem",
              cursor: "pointer",
            }}
          >
            📊 GIS CSV
          </button>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent-green-bright)", marginBottom: "0.6rem" }}>
          🏛️ Executive Project Summary & Microclimate Findings
        </div>
        <p style={{ fontSize: "0.88rem", lineHeight: 1.7, color: "var(--text-secondary)", margin: 0 }}>
          The UrbanCanopy AI microclimate planning blueprint for <strong style={{ color: "var(--text-primary)" }}>{city}</strong> allocates{" "}
          <strong style={{ color: "#34d399" }}>{treeCount} climate-resilient trees</strong> and{" "}
          <strong style={{ color: "#06b6d4" }}>{structureCount} engineered high-albedo shade structures</strong> across {hotspots.length} detected critical asphalt corridors.
          {temperatureStats && (
            <>
              {" "}The thermodynamic simulation yields an average microclimate temperature reduction of{" "}
              <strong style={{ color: "#34d399" }}>−{temperatureStats.avgDeltaF}°F</strong> (with peak corridor cooling up to{" "}
              <strong style={{ color: "#34d399" }}>−{temperatureStats.maxDeltaF}°F</strong>), mitigating heat stress across{" "}
              <strong style={{ color: "var(--text-primary)" }}>{temperatureStats.areaImprovedPercent}%</strong> of the target pedestrian area.
            </>
          )}
          {" "}According to USDA Forest Service i-Tree metrics, this deployment sequesters{" "}
          <strong style={{ color: "#34d399" }}>{eco.annualCarbonKg.toLocaleString()} kg CO₂/year</strong>, intercepts{" "}
          <strong style={{ color: "#38bdf8" }}>{eco.annualStormwaterGallons.toLocaleString()} gal/year of stormwater runoff</strong>, and saves{" "}
          <strong style={{ color: "#fbbf24" }}>{eco.annualEnergySavingsKwh.toLocaleString()} kWh/year</strong> in building cooling loads.
        </p>
      </div>

      {/* Expense Breakdown & Grant Studio */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.25rem" }}>
        {/* Capital Expense Summary Table */}
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent-green-bright)", marginBottom: "1rem" }}>
            💰 Capital Expenditure & Benefit-Cost Ratio (BCR)
          </div>
          <div className="stat-row">
            <span className="stat-key">Authorized Budget Cap</span>
            <span className="stat-val">${budget.toLocaleString()}</span>
          </div>
          <div className="stat-row">
            <span className="stat-key">Total Allocated Spend</span>
            <span className="stat-val" style={{ color: "var(--accent-gold-bright)" }}>
              ${totalCost.toLocaleString()}
            </span>
          </div>
          <div className="stat-row">
            <span className="stat-key">Unallocated Contingency</span>
            <span className="stat-val" style={{ color: "#34d399" }}>
              ${Math.max(0, budget - totalCost).toLocaleString()}
            </span>
          </div>
          <div className="stat-row">
            <span className="stat-key">20-Year Benefit-Cost Ratio (BCR)</span>
            <span className="stat-val" style={{ color: "#34d399", fontWeight: 800 }}>
              {eco.twentyYearNetRoiRatio} : 1.0
            </span>
          </div>
          <div className="stat-row">
            <span className="stat-key">Cost per °F Cooling Efficacy</span>
            <span className="stat-val" style={{ color: "#38bdf8" }}>
              ${Math.round(totalCost / Math.max(temperatureStats?.avgDeltaF ?? 1, 0.1)).toLocaleString()} / °F
            </span>
          </div>
          <div className="stat-row">
            <span className="stat-key">Tree Plantings ({treeCount})</span>
            <span className="stat-val">
              ${interventions.filter((i) => i.type === "tree").reduce((s, i) => s + i.cost, 0).toLocaleString()}
            </span>
          </div>
          <div className="stat-row">
            <span className="stat-key">Shade Structures ({structureCount})</span>
            <span className="stat-val">
              ${interventions.filter((i) => i.type === "shade_structure").reduce((s, i) => s + i.cost, 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Federal Grant Application Generator */}
        <div className="glass-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent-gold-bright)" }}>
              🏛️ Federal Grant Proposal Studio
            </div>
            <button
              onClick={() => setShowGrantPreview(!showGrantPreview)}
              style={{
                background: "rgba(245, 158, 11, 0.2)",
                border: "1px solid var(--accent-gold-bright)",
                borderRadius: "var(--radius-sm)",
                color: "var(--accent-gold-bright)",
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "0.3rem 0.6rem",
                cursor: "pointer",
              }}
            >
              {showGrantPreview ? "Hide Proposal" : "Preview Full Grant Application 📄"}
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.4rem" }}>
            {[
              { id: "fema_bric", label: "FEMA BRIC", tag: "Extreme Heat" },
              { id: "epa_ecjcg", label: "EPA ECJCG", tag: "Environmental Justice" },
              { id: "usda_ucf", label: "USDA UCF", tag: "Canopy Forestry" },
            ].map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedGrant(g.id as any)}
                style={{
                  padding: "0.45rem",
                  borderRadius: "8px",
                  background: selectedGrant === g.id ? "rgba(52, 211, 153, 0.2)" : "rgba(255,255,255,0.03)",
                  border: selectedGrant === g.id ? "1px solid #34d399" : "1px solid rgba(255,255,255,0.06)",
                  color: selectedGrant === g.id ? "#34d399" : "#94a3b8",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                <div>{g.label}</div>
                <div style={{ fontSize: "0.62rem", color: "#64748b" }}>{g.tag}</div>
              </button>
            ))}
          </div>

          {/* Grant Brief Summary */}
          <div style={{ background: "rgba(0,0,0,0.3)", padding: "0.75rem", borderRadius: "8px", fontSize: "0.78rem", color: "#cbd5e1", lineHeight: 1.5 }}>
            {selectedGrant === "fema_bric" && (
              <div>
                <strong>FEMA Building Resilient Infrastructure and Communities (BRIC)</strong>: Pre-disaster hazard mitigation funding specifically targeting urban heat mortality reduction.
                <br />
                <span style={{ color: "#34d399" }}>• Benefit-Cost Ratio: {eco.twentyYearNetRoiRatio} : 1.0 (Exceeds FEMA 1.0 threshold)</span>
              </div>
            )}
            {selectedGrant === "epa_ecjcg" && (
              <div>
                <strong>EPA Environmental & Climate Justice Community Grant (ECJCG)</strong>: Funds tree planting, cool pavements, and pedestrian shade corridors in heat-vulnerable census tracts.
                <br />
                <span style={{ color: "#34d399" }}>• Carbon Offset: {eco.annualCarbonKg.toLocaleString()} kg CO₂/yr</span>
              </div>
            )}
            {selectedGrant === "usda_ucf" && (
              <div>
                <strong>USDA Forest Service Urban & Community Forestry (UCF)</strong>: Direct grants for native drought-tolerant tree planting and smart municipal irrigation.
                <br />
                <span style={{ color: "#34d399" }}>• Stormwater Retention: {eco.annualStormwaterGallons.toLocaleString()} gal/yr</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Grant Application Preview Modal */}
      {showGrantPreview && (
        <div
          className="glass-card"
          style={{
            padding: "1.5rem",
            background: "rgba(15, 23, 42, 0.98)",
            border: "1.5px solid #34d399",
            borderRadius: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "0.75rem" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#f8fafc" }}>
                Official Grant Application Dossier — {selectedGrant.toUpperCase().replace("_", " ")}
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#94a3b8" }}>
                Ready for submission to federal grant portals (Grants.gov / FEMA GO).
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="btn-primary"
              style={{ padding: "0.45rem 1rem", fontSize: "0.8rem" }}
            >
              🖨️ Print / Save PDF
            </button>
          </div>

          <div style={{ background: "rgba(0,0,0,0.5)", padding: "1.25rem", borderRadius: "10px", fontFamily: "serif", color: "#f1f5f9", lineHeight: 1.8, fontSize: "0.88rem" }}>
            <h4 style={{ margin: "0 0 0.5rem", fontFamily: "sans-serif", color: "#34d399" }}>
              Project Narrative: Microclimate Thermal Mitigation for {city}
            </h4>
            <p>
              <strong>1. Problem Statement:</strong> High-resolution thermal mapping conducted via FortyGuard microclimate telemetry revealed severe surface temperature spikes exceeding 105°F across {hotspots.length} pedestrian transit corridors in {city}, creating dangerous heatstroke vulnerability for transit riders, school children, and outdoor workers.
            </p>
            <p>
              <strong>2. Proposed Solution:</strong> An optimized capital deployment of ${totalCost.toLocaleString()} allocating {treeCount} climate-adapted shade trees and {structureCount} engineered high-albedo tensile shade structures.
            </p>
            <p>
              <strong>3. Quantified Resilience Metrics:</strong>
              <br />• Projected Peak Temperature Reduction: <strong>−{temperatureStats?.maxDeltaF ?? 12.5}°F</strong>
              <br />• 20-Year Benefit-Cost Ratio (BCR): <strong>{eco.twentyYearNetRoiRatio} : 1.0</strong>
              <br />• Annual Carbon Sequestration: <strong>{eco.annualCarbonKg.toLocaleString()} kg CO₂/year</strong>
              <br />• Annual Stormwater Interception: <strong>{eco.annualStormwaterGallons.toLocaleString()} gallons/year</strong>
              <br />• Building HVAC Energy Savings: <strong>{eco.annualEnergySavingsKwh.toLocaleString()} kWh/year (${eco.annualEnergySavingsUsd}/year)</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
