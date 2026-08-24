"use client";
// ─── Screen 1 — Authentication & Onboarding Component (PRD §5.2) ───────────
// Dual-panel onboarding layout with Role Selector, Tagline, and Live Impact Ticker.

import React, { useState } from "react";
import { useAppStore } from "@/store/app-store";

export default function OnboardingModal() {
  const { userRole, setUserRole, userEmail, setUserEmail, showOnboardingModal, setShowOnboardingModal } = useAppStore();
  const [email, setEmail] = useState(userEmail || "urban.planner@phoenix.gov");
  const [password, setPassword] = useState("••••••••••••");
  const [selectedRole, setSelectedRole] = useState<"municipality" | "esg">(userRole || "municipality");

  if (!showOnboardingModal) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUserRole(selectedRole);
    setUserEmail(email);
    setShowOnboardingModal(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(6, 21, 16, 0.85)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "1rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 880,
          background: "#ffffff",
          borderRadius: 20,
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: "1.1fr 1fr",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.5)",
          border: "1px solid rgba(181, 216, 136, 0.3)",
        }}
      >
        {/* Left Panel: Auth & Role Selection (PRD §5.2) */}
        <div style={{ padding: "2.5rem 2rem", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#ffffff" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
              <span style={{ fontSize: "1.6rem" }}>🌳</span>
              <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#144D35", letterSpacing: "-0.02em" }}>
                UrbanCool AI
              </span>
            </div>

            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1B2E24", marginBottom: "0.4rem" }}>
              Welcome to UrbanCool
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1.75rem" }}>
              Data-driven microclimate optimization & smart reforestation platform.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
              {/* Role Selector */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#144D35", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                  Select Your Operational Role
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => setSelectedRole("municipality")}
                    style={{
                      padding: "0.75rem 0.5rem",
                      borderRadius: 10,
                      border: selectedRole === "municipality" ? "2px solid #144D35" : "1px solid #e2e8f0",
                      background: selectedRole === "municipality" ? "rgba(20, 77, 53, 0.08)" : "#f8fafc",
                      color: selectedRole === "municipality" ? "#144D35" : "#64748b",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div style={{ fontSize: "1.1rem", marginBottom: "0.2rem" }}>🏛️</div>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700 }}>Municipality</div>
                    <div style={{ fontSize: "0.68rem", color: "#64748b" }}>Urban Planning Office</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole("esg")}
                    style={{
                      padding: "0.75rem 0.5rem",
                      borderRadius: 10,
                      border: selectedRole === "esg" ? "2px solid #144D35" : "1px solid #e2e8f0",
                      background: selectedRole === "esg" ? "rgba(20, 77, 53, 0.08)" : "#f8fafc",
                      color: selectedRole === "esg" ? "#144D35" : "#64748b",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div style={{ fontSize: "1.1rem", marginBottom: "0.2rem" }}>🏢</div>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700 }}>Real-Estate / ESG</div>
                    <div style={{ fontSize: "0.68rem", color: "#64748b" }}>Developer ESG Team</div>
                  </button>
                </div>
              </div>

              {/* Email */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#144D35", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                  Institutional Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "0.65rem 0.85rem",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: "0.85rem",
                    color: "#1B2E24",
                    outline: "none",
                  }}
                />
              </div>

              {/* Password */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#144D35", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "0.65rem 0.85rem",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: "0.85rem",
                    color: "#1B2E24",
                    outline: "none",
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  marginTop: "0.5rem",
                  padding: "0.8rem",
                  borderRadius: 8,
                  border: "none",
                  background: "#144D35",
                  color: "#ffffff",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 15px rgba(20, 77, 53, 0.35)",
                  transition: "background 0.2s ease",
                }}
              >
                Access Microclimate Studio →
              </button>
            </form>
          </div>

          <div style={{ fontSize: "0.7rem", color: "#94a3b8", textAlign: "center", marginTop: "1rem" }}>
            Secured by FortyGuard Temperature API · ISO 14064 ESG Standard
          </div>
        </div>

        {/* Right Panel: Mint Artwork & Impact Ticker (PRD §5.2) */}
        <div
          style={{
            background: "#EAF5E4",
            padding: "2.5rem 2rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            borderLeft: "1px solid rgba(181, 216, 136, 0.4)",
          }}
        >
          <div>
            <div style={{ display: "inline-block", padding: "0.3rem 0.75rem", borderRadius: 999, background: "#B5D888", color: "#144D35", fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", marginBottom: "1.2rem" }}>
              Impact Ticker · Live ESG Ledger
            </div>

            <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#144D35", lineHeight: 1.3, marginBottom: "0.75rem" }}>
              “We plant it so we can find shade under it.”
            </h3>
            <p style={{ fontSize: "0.82rem", color: "#475569", lineHeight: 1.5, marginBottom: "2rem" }}>
              Treating urban cooling as an engineering optimization problem backed by heat-reduction scores and projected avoided HVAC costs.
            </p>

            {/* Impact Ticker Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={{ background: "#ffffff", padding: "1rem", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#144D35" }}>142,850</div>
                <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Trees Planned Globally</div>
              </div>

              <div style={{ background: "#ffffff", padding: "1rem", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#6CB83A" }}>3,140 T</div>
                <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>CO₂ Sequestered / Yr</div>
              </div>

              <div style={{ background: "#ffffff", padding: "1rem", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#144D35" }}>$1.84M</div>
                <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Avoided Cooling HVAC</div>
              </div>

              <div style={{ background: "#ffffff", padding: "1rem", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#6CB83A" }}>34 Cities</div>
                <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Active Municipalities</div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem", color: "#64748b", paddingTop: "1.5rem" }}>
            <span>Powered by FortyGuard APIs</span>
            <button
              onClick={() => setShowOnboardingModal(false)}
              style={{ background: "transparent", border: "none", color: "#144D35", fontWeight: 700, cursor: "pointer" }}
            >
              Skip Intro ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
