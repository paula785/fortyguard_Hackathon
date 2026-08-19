"use client";
// ─── AI Chat Panel ────────────────────────────────────────────────────────────

import { useRef, useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/store/app-store";
import type { AgentStep } from "@/store/app-store";

const QUICK_ACTIONS = [
  "Analyze Phoenix downtown transit corridors",
  "Bus stops near schools in Miami",
  "High-traffic parking lots in Houston",
  "Senior community shade gaps in Las Vegas",
];

export default function AgentChat() {
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
  } = useAppStore();

  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, agentSteps]);

  const handleSubmit = useCallback(async (message: string) => {
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

            // Extract data from tool results
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
            // Skip invalid JSON
          }
        }
      }
    } catch (err: unknown) {
      addChatMessage({
        role: "system",
        content: `❌ Error: ${(err as Error).message}`,
      });
    } finally {
      setAgentRunning(false);
    }
  }, [isAgentRunning, city, lat, lon, budget, preferences.mode, addChatMessage, clearAgentSteps, setAgentRunning, addAgentStep, setHeatmapBefore, setHeatmapAfter, setHotspots, setInterventions, setTemperatureStats, setIrrigationPlan, setKPIs]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(inputValue);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  const currentProgressStep = agentSteps.filter(s => s.type === "progress").slice(-1)[0];

  return (
    <div className="chat-container">
      {/* Messages */}
      <div className="chat-messages">
        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-bubble ${msg.role}`}
          >
            <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
          </div>
        ))}

        {/* Live progress indicator */}
        {isAgentRunning && currentProgressStep && (
          <div className="chat-step">
            <div className="spinner" style={{ width: 14, height: 14 }} />
            <span>{currentProgressStep.message}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions */}
      {!isAgentRunning && chatMessages.length <= 1 && (
        <div className="quick-actions">
          {QUICK_ACTIONS.map((qa) => (
            <button
              key={qa}
              className="quick-action"
              onClick={() => handleSubmit(qa + ` with $${(budget/1000).toFixed(0)}K budget`)}
            >
              {qa}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="chat-input-area">
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          placeholder={isAgentRunning ? "Agent is working..." : "Describe the area to analyze..."}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isAgentRunning}
          rows={1}
        />
        <button
          className="btn btn-primary btn-icon"
          onClick={() => handleSubmit(inputValue)}
          disabled={isAgentRunning || !inputValue.trim()}
          title="Send"
        >
          {isAgentRunning ? (
            <div className="spinner" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 2-7 20-4-9-9-4Z"/>
              <path d="M22 2 11 13"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
