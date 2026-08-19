"use client";
// ─── Blueprint Export Panel ────────────────────────────────────────────────────

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
  } = useAppStore();

  const hasData = interventions.length > 0;
  const totalCost = interventions.reduce((s, i) => s + i.cost, 0);
  const treeCount = interventions.filter(i => i.type === "tree").length;
  const structureCount = interventions.filter(i => i.type === "shade_structure").length;

  const exportBlueprint = () => {
    const blueprint = {
      project: {
        name: `UrbanCanopy AI Blueprint — ${city}`,
        generatedAt: new Date().toISOString(),
        city,
        budget,
      },
      summary: {
        totalInterventions: interventions.length,
        treeCount,
        structureCount,
        totalCost,
        remainingBudget: budget - totalCost,
      },
      kpis,
      temperatureStats,
      irrigationSummary: irrigationPlan ? {
        totalDailyGallons: irrigationPlan.totalDailyGallons,
        totalWeeklyGallons: irrigationPlan.totalWeeklyGallons,
        savedVsStaticGallons: irrigationPlan.savedVsStaticGallons,
        droughtMode: irrigationPlan.droughtMode,
      } : null,
      hotspots: hotspots.map(h => ({
        lat: h.lat,
        lon: h.lon,
        temperatureF: h.temperatureF,
        priority: h.priority,
        surfaceType: h.surfaceType,
      })),
      interventions: interventions.map(p => ({
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
      irrigationSchedule: irrigationPlan?.plants ?? [],
      grants: [
        "EPA Urban Heat Island Reduction Program",
        "USDA Urban & Community Forestry Program",
        "HUD Community Development Block Grant (CDBG)",
        "DOE Office of Energy Efficiency — Building Technologies",
      ],
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
      ...interventions.map(p => [
        p.id, p.type, p.name, p.lat.toFixed(6), p.lon.toFixed(6),
        p.cost, p.coolingDeltaF.toFixed(1), p.waterGalPerDay,
      ]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `urbancanopy-interventions-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: "var(--space-md)", display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>

      {hasData ? (
        <>
          {/* Executive Summary */}
          <div className="glass-card" style={{ padding: "var(--space-md)" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--accent-blue-light)", marginBottom: "0.75rem" }}>
              Executive Summary
            </div>
            <p style={{ fontSize: "0.82rem", lineHeight: 1.7, color: "var(--text-secondary)" }}>
              The UrbanCanopy AI blueprint for <strong style={{ color: "var(--text-primary)" }}>{city}</strong> proposes{" "}
              <strong style={{ color: "#4ade80" }}>{treeCount} trees</strong> and{" "}
              <strong style={{ color: "var(--accent-teal)" }}>{structureCount} shade structures</strong>{" "}
              within the <strong style={{ color: "var(--accent-gold)" }}>${budget.toLocaleString()}</strong> budget.
              {temperatureStats && (
                <> Expected cooling: <strong style={{ color: "#4ade80" }}>−{temperatureStats.avgDeltaF}°F</strong> average,
                improving <strong style={{ color: "#a78bfa" }}>{temperatureStats.areaImprovedPercent}%</strong> of target area.</>
              )}
              {irrigationPlan && (
                <> Smart irrigation saves <strong style={{ color: "var(--accent-teal)" }}>{irrigationPlan.savedVsStaticGallons.toLocaleString()} gallons/week</strong> vs static timers.</>
              )}
            </p>
          </div>

          {/* Capital Expense Table */}
          <div className="glass-card" style={{ padding: "var(--space-md)" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--accent-blue-light)", marginBottom: "0.75rem" }}>
              Capital Expense Summary
            </div>
            <div className="stat-row">
              <span className="stat-key">Budget Cap</span>
              <span className="stat-val">${(budget ?? 0).toLocaleString()}</span>
            </div>
            <div className="stat-row">
              <span className="stat-key">Total Allocated</span>
              <span className="stat-val" style={{ color: "var(--accent-gold)" }}>${(totalCost ?? 0).toLocaleString()}</span>
            </div>
            <div className="stat-row">
              <span className="stat-key">Remaining</span>
              <span className="stat-val" style={{ color: "#4ade80" }}>${(Math.max((budget ?? 0) - totalCost, 0)).toLocaleString()}</span>
            </div>
            <div className="stat-row">
              <span className="stat-key">Cost per °F Cooling</span>
              <span className="stat-val">${(kpis?.budgetEfficiencyDollarPerDegree ?? Math.round(totalCost / Math.max(temperatureStats?.avgDeltaF ?? 1, 0.1))).toLocaleString()}</span>
            </div>
            <div className="stat-row">
              <span className="stat-key">Trees ({treeCount})</span>
              <span className="stat-val">${interventions.filter(i=>i.type==="tree").reduce((s,i)=>s+i.cost,0).toLocaleString()}</span>
            </div>
            <div className="stat-row">
              <span className="stat-key">Structures ({structureCount})</span>
              <span className="stat-val">${interventions.filter(i=>i.type==="shade_structure").reduce((s,i)=>s+i.cost,0).toLocaleString()}</span>
            </div>
          </div>

          {/* Grant programs */}
          <div className="glass-card" style={{ padding: "var(--space-md)" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--accent-gold)", marginBottom: "0.75rem" }}>
              🏛️ Applicable Grant Programs
            </div>
            {[
              "EPA Urban Heat Island Reduction Program",
              "USDA Urban & Community Forestry Program",
              "HUD Community Development Block Grant (CDBG)",
              "DOE Office of Energy Efficiency — Building Technologies",
            ].map(grant => (
              <div key={grant} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.4rem", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                <span style={{ color: "var(--accent-gold)" }}>◆</span>
                {grant}
              </div>
            ))}
          </div>

          {/* Export buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <button className="btn btn-primary" style={{ justifyContent: "center" }} onClick={exportBlueprint}>
              📥 Export Full Blueprint (JSON)
            </button>
            <button className="btn btn-secondary" style={{ justifyContent: "center" }} onClick={exportCSV}>
              📋 Export Coordinates (CSV)
            </button>
          </div>
        </>
      ) : (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-2xl) var(--space-md)",
          textAlign: "center",
          gap: "var(--space-md)",
        }}>
          <div style={{ fontSize: "3rem" }}>📄</div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.6, maxWidth: 220 }}>
            The grant-ready blueprint and export options appear after the agent completes the analysis.
          </div>
        </div>
      )}
    </div>
  );
}
