"use client";
// ─── LangGraph AI Assistant & Planner Studio ──────────────────────────────────

import { useRef, useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/store/app-store";
import type { AgentStep } from "@/store/app-store";

const QUICK_SCENARIOS = [
  {
    title: "🚶 Transit Corridors",
    desc: "Analyze unshaded pedestrian routes connecting light rail & bus lines",
    query: "Analyze downtown transit corridors with high pedestrian foot traffic and minimal canopy coverage",
  },
  {
    title: "🏫 School & Daycare Zones",
    desc: "Target bus stops, crosswalks, and playgrounds near schools",
    query: "Identify shade gaps around school pick-up zones and active playgrounds to lower child heat exposure",
  },
  {
    title: "🚗 Surface Parking Lots",
    desc: "Mitigate severe asphalt heat islands in commercial shopping districts",
    query: "Optimize high-traffic asphalt parking lots with rapid engineered shade sails and drought-tolerant trees",
  },
  {
    title: "👵 Senior Living Centers",
    desc: "Protect vulnerable elderly populations in outdoor seating areas",
    query: "Deploy cooling canopies and high-albedo structures near senior community centers and clinics",
  },
];

export default function AgentChat({ isFullView = false }: { isFullView?: boolean }) {
  const {
    chatMessages,
    addChatMessage,
    isAgentRunning,
    setAgentRunning,
    clearAgentSteps,
    addAgentStep,
    city,
    lat,
    lon,
    budget,
    preferences,
    setHeatmapBefore,
    setHeatmapAfter,
    setHotspots,
    setInterventions,
    setTemperatureStats,
    setIrrigationPlan,
    setKPIs,
    agentSteps,
    setActiveMainTab,
  } = useAppStore();

  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, agentSteps]);

  const handleSubmit = useCallback(
    async (message: string) => {
      if (!message.trim() || isAgentRunning) return;

      addChatMessage({ role: "user", content: message });
      setInputValue("");
      clearAgentSteps();
      setAgentRunning(true);

      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brief: message,
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
              const step: AgentStep = JSON.parse(line.slice(6));
              addAgentStep(step);

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
              // Ignore parse error
            }
          }
        }
      } catch (err: unknown) {
        addChatMessage({
          role: "system",
          content: `Agent error: ${(err as Error).message}`,
        });
      } finally {
        setAgentRunning(false);
      }
    },
    [
      isAgentRunning,
      addChatMessage,
      clearAgentSteps,
      setAgentRunning,
      city,
      lat,
      lon,
      budget,
      preferences.mode,
      addAgentStep,
      setHeatmapBefore,
      setHeatmapAfter,
      setHotspots,
      setInterventions,
      setTemperatureStats,
      setIrrigationPlan,
      setKPIs,
    ]
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: isFullView ? "var(--space-lg)" : 0,
        gap: isFullView ? "var(--space-md)" : 0,
      }}
    >
      {/* Full View Scenario Header */}
      {isFullView && (
        <div style={{ marginBottom: "0.5rem" }}>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)" }}>
            🤖 LangGraph Autonomous Urban Planning Agent
          </div>
          <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
            Stateful multi-tool agent powered by **Google Gemini** & **FortyGuard APIs**. Pick a scenario or enter a custom brief.
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "0.75rem",
              marginTop: "1rem",
            }}
          >
            {QUICK_SCENARIOS.map((sc) => (
              <div
                key={sc.title}
                className="glass-card"
                style={{
                  padding: "0.75rem",
                  cursor: "pointer",
                  border: "1px solid var(--border-subtle)",
                }}
                onClick={() => handleSubmit(sc.query)}
              >
                <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#34d399", marginBottom: "0.2rem" }}>
                  {sc.title}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.3 }}>
                  {sc.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div
        className="chat-messages"
        style={{
          flex: 1,
          overflowY: "auto",
          background: isFullView ? "rgba(6, 21, 16, 0.7)" : "transparent",
          borderRadius: isFullView ? "var(--radius-lg)" : 0,
          border: isFullView ? "1px solid var(--border-subtle)" : "none",
          padding: "var(--space-md)",
        }}
      >
        {chatMessages.map((msg) => (
          <div key={msg.id} className={`chat-bubble ${msg.role}`}>
            {msg.role === "assistant" && (
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#34d399", marginBottom: "0.25rem" }}>
                🌳 UrbanCanopy AI
              </div>
            )}
            <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
          </div>
        ))}

        {isAgentRunning && (
          <div
            className="chat-bubble assistant"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                border: "2px solid #34d399",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <span style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>
              LangGraph Agent analyzing microclimate data & optimizing placements...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(inputValue);
        }}
        className="chat-input-area"
        style={{
          borderRadius: isFullView ? "var(--radius-md)" : 0,
          marginTop: isFullView ? "0.5rem" : 0,
        }}
      >
        <input
          type="text"
          placeholder={`Describe urban planning goals for ${city}...`}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isAgentRunning}
          className="text-input"
          style={{ flex: 1 }}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={isAgentRunning || !inputValue.trim()}
          style={{ padding: "0.6rem 1.2rem", width: "auto" }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
