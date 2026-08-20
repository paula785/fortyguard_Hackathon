"use client";
// ─── Municipal Blueprint & Grant Export Studio ────────────────────────────────

import { useAppStore } from "@/store/app-store";

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

  const hasData = interventions.length > 0;
  const totalCost = interventions.reduce((s, i) => s + i.cost, 0);
  const treeCount = interventions.filter((i) => i.type === "tree").length;
  const structureCount = interventions.filter((i) => i.type === "shade_structure").length;

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

  const exportCSV = () => {
    const rows = [
      ["ID", "Type", "Name", "Latitude", "Longitude", "Cost ($)", "Cooling (°F)", "Water (gal/day)"],
      ...interventions.map((p) => [
        p.id,
        p.type,
        `"${p.name}"`,
        p.lat.toFixed(6),
        p.lon.toFixed(6),
        p.cost,
        p.coolingDeltaF.toFixed(1),
        p.waterGalPerDay,
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
          Run the Canopy Optimizer or AI Assistant to generate the complete capital expenditure plan and grant-ready documentation.
        </div>
        <button
          className="btn-primary"
          onClick={() => setActiveMainTab("optimizer")}
          style={{ maxWidth: 220, marginTop: "0.5rem" }}
        >
          🌳 Go to Canopy Optimizer
        </button>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "var(--space-lg)", display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      {/* Top Banner & Export Actions */}
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
            📄 Municipal Cooling Blueprint & Grant Deliverable
          </div>
          <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
            Jurisdiction: <strong style={{ color: "#34d399" }}>{city}</strong> · Capital Cap: <strong style={{ color: "var(--accent-gold-bright)" }}>${budget.toLocaleString()}</strong>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="btn-primary" onClick={exportBlueprint} style={{ padding: "0.6rem 1.2rem" }}>
            📥 Download Blueprint (JSON)
          </button>
          <button
            onClick={exportCSV}
            style={{
              padding: "0.6rem 1.2rem",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid var(--border-medium)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-primary)",
              fontWeight: 700,
              fontSize: "0.82rem",
              cursor: "pointer",
            }}
          >
            📊 Export GIS Coordinates (CSV)
          </button>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="glass-card" style={{ padding: "var(--space-lg)" }}>
        <div style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent-green-bright)", marginBottom: "0.75rem" }}>
          🏛️ Executive Project Summary
        </div>
        <p style={{ fontSize: "0.88rem", lineHeight: 1.7, color: "var(--text-secondary)" }}>
          The UrbanCanopy AI microclimate planning blueprint for <strong style={{ color: "var(--text-primary)" }}>{city}</strong> allocates{" "}
          <strong style={{ color: "#34d399" }}>{treeCount} climate-resilient trees</strong> and{" "}
          <strong style={{ color: "#06b6d4" }}>{structureCount} engineered high-albedo shade structures</strong> within the authorized{" "}
          <strong style={{ color: "var(--accent-gold-bright)" }}>${budget.toLocaleString()}</strong> capital improvement budget.
          {temperatureStats && (
            <>
              {" "}The projected microclimate reduction achieves an average cooling drop of{" "}
              <strong style={{ color: "#34d399" }}>−{temperatureStats.avgDeltaF}°F</strong> (with peak corridor cooling up to{" "}
              <strong style={{ color: "#34d399" }}>−{temperatureStats.maxDeltaF}°F</strong>), benefiting approximately{" "}
              <strong style={{ color: "var(--text-primary)" }}>{temperatureStats.areaImprovedPercent}%</strong> of the target pedestrian area.
            </>
          )}
          {irrigationPlan && (
            <>
              {" "}Autonomous diurnal irrigation programming conserves an estimated{" "}
              <strong style={{ color: "#06b6d4" }}>{irrigationPlan.savedVsStaticGallons.toLocaleString()} gallons/week</strong> compared to static municipal timer systems.
            </>
          )}
        </p>
      </div>

      {/* Expense Breakdown & Grant Matching */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "var(--space-md)" }}>
        {/* Capital Expense Summary Table */}
        <div className="glass-card" style={{ padding: "var(--space-lg)" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent-green-bright)", marginBottom: "1rem" }}>
            💰 Capital Expenditure Summary
          </div>
          <div className="stat-row">
            <span className="stat-key">Authorized Budget Cap</span>
            <span className="stat-val">${budget.toLocaleString()}</span>
          </div>
          <div className="stat-row">
            <span className="stat-key">Total Allocated</span>
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
            <span className="stat-key">Cost per °F Cooling Efficiency</span>
            <span className="stat-val" style={{ color: "#34d399" }}>
              ${Math.round(totalCost / Math.max(temperatureStats?.avgDeltaF ?? 1, 0.1)).toLocaleString()} / °F
            </span>
          </div>
          <div className="stat-row">
            <span className="stat-key">Tree Interventions ({treeCount})</span>
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

        {/* Federal Grant Eligibility Cards */}
        <div className="glass-card" style={{ padding: "var(--space-lg)" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent-gold-bright)", marginBottom: "1rem" }}>
            🏛️ Applicable Federal & State Grant Programs
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {[
              {
                name: "EPA Urban Heat Island Reduction Program",
                match: "100% Eligible",
                desc: "Matches cooling corridors reducing surface temps over unshaded asphalt.",
              },
              {
                name: "USDA Urban & Community Forestry Grant",
                match: "100% Eligible",
                desc: "Funds native tree canopy expansion and long-term watering systems.",
              },
              {
                name: "HUD Community Development Block Grant (CDBG)",
                match: "Eligible for Transit Corridors",
                desc: "Infrastructure funds for shaded bus stops and pedestrian walkways.",
              },
              {
                name: "DOE Building Technologies Energy Efficiency",
                match: "Eligible for Albedo Structures",
                desc: "Subsidizes high-reflectance tensile canopies reducing building thermal load.",
              },
            ].map((grant) => (
              <div
                key={grant.name}
                style={{
                  padding: "0.65rem",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.8rem", color: "var(--text-primary)" }}>
                    {grant.name}
                  </span>
                  <span className="pill" style={{ background: "rgba(16,185,129,0.2)", color: "#34d399", fontSize: "0.65rem" }}>
                    {grant.match}
                  </span>
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                  {grant.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
