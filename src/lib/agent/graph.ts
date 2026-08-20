// ─── LangGraph Agent — Stateful Graph & Autonomous Pipeline ──────────────────

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import {
  ALL_TOOLS,
  fetchHeatmapTool,
  fetchSatelliteTool,
  fetchEnvParamsTool,
  analyzeHotspotsTool,
  optimizeInterventionsTool,
  simulateCoolingTool,
  calculateIrrigationTool,
  generateReportTool,
} from "./tools";
import { SYSTEM_PROMPT } from "./prompts";

// ── Types for streaming response ──────────────────────────────────────────
export interface AgentStep {
  type: "progress" | "tool_result" | "message" | "complete" | "error";
  message: string;
  data?: unknown;
  stepIndex?: number;
}

// ── Autonomous Multi-Step Pipeline ────────────────────────────────────────
export async function* runAutonomousPipeline(
  city: string,
  lat: number,
  lon: number,
  budget: number,
  mode: "low_water" | "fast_shade" | "max_cooling" | "balanced",
  brief: string
): AsyncGenerator<AgentStep> {
  let stepIndex = 0;

  yield {
    type: "progress",
    message: `🧠 Initializing microclimate audit for ${city}...`,
    stepIndex: stepIndex++,
  };

  yield {
    type: "message",
    message: `Starting autonomous microclimate urban-planning analysis for **${city}** with a budget of **$${budget.toLocaleString()}** (Priority: **${mode}**).\n\nBrief: *"${brief}"*`,
    stepIndex: stepIndex++,
  };

  // Step 1: Heatmap
  yield {
    type: "progress",
    message: "🌡️ Querying FortyGuard Hyperlocal Temperature API...",
    stepIndex: stepIndex++,
  };

  const heatmapRes = await fetchHeatmapTool.invoke({
    lat,
    lon,
    radius_km: 2,
    date: "2024-07-15",
  });

  yield {
    type: "tool_result",
    message: heatmapRes.summary,
    data: heatmapRes,
    stepIndex: stepIndex++,
  };

  if (!heatmapRes.data) {
    yield {
      type: "error",
      message: "Failed to retrieve thermal heatmap from FortyGuard API.",
      stepIndex: stepIndex++,
    };
    return;
  }

  // Step 2: Satellite Segmentation
  yield {
    type: "progress",
    message: "🛰️ Analyzing satellite imagery and land-cover segmentation...",
    stepIndex: stepIndex++,
  };

  const satRes = await fetchSatelliteTool.invoke({
    lat,
    lon,
    date: "2024-07-15",
  });

  yield {
    type: "tool_result",
    message: satRes.summary,
    data: satRes,
    stepIndex: stepIndex++,
  };

  // Step 3: Environmental Params
  yield {
    type: "progress",
    message: "🌤️ Fetching solar irradiance, humidity, and heat index...",
    stepIndex: stepIndex++,
  };

  const envRes = await fetchEnvParamsTool.invoke({
    lat,
    lon,
    temperature_c: 38,
    date: "2024-07-15",
  });

  yield {
    type: "tool_result",
    message: envRes.summary,
    data: envRes,
    stepIndex: stepIndex++,
  };

  // Step 4: Hotspot Analysis
  yield {
    type: "progress",
    message: "🔍 Detecting unshaded asphalt corridors and critical heat islands...",
    stepIndex: stepIndex++,
  };

  const hotspotRes = await analyzeHotspotsTool.invoke({
    heatmap_data: heatmapRes.data,
    satellite_segments: satRes.segments || {},
    top_n: 16,
  });

  yield {
    type: "tool_result",
    message: hotspotRes.summary,
    data: hotspotRes,
    stepIndex: stepIndex++,
  };

  yield {
    type: "message",
    message: `📍 **Thermal Audit Findings:** Identified **${hotspotRes.criticalCount} critical heat corridors** exhibiting peak surface temperatures above 105°F over unshaded asphalt and concrete.`,
    stepIndex: stepIndex++,
  };

  // Step 5: Optimization
  yield {
    type: "progress",
    message: `🌳 Optimizing tree species mix & engineered shade placement ($${budget.toLocaleString()} budget)...`,
    stepIndex: stepIndex++,
  };

  const optRes = await optimizeInterventionsTool.invoke({
    hotspots: hotspotRes.hotspots,
    budget_cap: budget,
    mode,
  });

  yield {
    type: "tool_result",
    message: optRes.summary,
    data: optRes,
    stepIndex: stepIndex++,
  };

  // Step 6: Thermal Simulation
  yield {
    type: "progress",
    message: "🧮 Running before/after microclimate cooling simulation...",
    stepIndex: stepIndex++,
  };

  const simRes = await simulateCoolingTool.invoke({
    heatmap_data: heatmapRes.data,
    placements: optRes.placements,
  });

  yield {
    type: "tool_result",
    message: simRes.summary,
    data: simRes,
    stepIndex: stepIndex++,
  };

  // Step 7: Dynamic Irrigation
  yield {
    type: "progress",
    message: "💧 Calculating temperature-adaptive diurnal watering schedules...",
    stepIndex: stepIndex++,
  };

  const irrRes = await calculateIrrigationTool.invoke({
    placements: optRes.placements,
    env_params_data: envRes.data,
    drought_mode: mode === "low_water",
  });

  yield {
    type: "tool_result",
    message: irrRes.summary,
    data: irrRes,
    stepIndex: stepIndex++,
  };

  // Step 8: Blueprint & KPIs
  yield {
    type: "progress",
    message: "📊 Generating municipal cooling blueprint and grant report...",
    stepIndex: stepIndex++,
  };

  const reportRes = await generateReportTool.invoke({
    city,
    area_name: city,
    budget,
    temp_stats: simRes.stats,
    irrigation_plan: irrRes.plan,
    placements: optRes.placements,
  });

  yield {
    type: "tool_result",
    message: reportRes.summary,
    data: reportRes,
    stepIndex: stepIndex++,
  };

  yield {
    type: "message",
    message: `🎉 **Blueprint Finalized!**\n\n${reportRes.executiveSummary}\n\n* **Expected Cooling:** -${simRes.stats.avgDeltaF}°F avg (up to -${simRes.stats.maxDeltaF}°F in hot spots)\n* **Allocated Budget:** $${reportRes.kpis.totalBudgetUsed.toLocaleString()} (${reportRes.kpis.totalInterventions} interventions)\n* **Water Conservation:** ${irrRes.plan.savedVsStaticGallons.toLocaleString()} gal/week saved`,
    stepIndex: stepIndex++,
  };

  yield {
    type: "complete",
    message: "✅ Cooling blueprint complete! Toggle the 'After' layer on the map or inspect KPIs.",
    stepIndex: stepIndex++,
  };
}

// ── LLM React Agent (when Gemini Key is active) ───────────────────────────
function createUrbanCanopyAgent() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    return null;
  }

  const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey,
    temperature: 0.1,
  });

  return createReactAgent({
    llm,
    tools: ALL_TOOLS,
    messageModifier: SYSTEM_PROMPT,
  });
}

// ── Main Stream Handler ───────────────────────────────────────────────────
export async function* runAgentStream(
  userMessage: string,
  params?: {
    city: string;
    lat: number;
    lon: number;
    budget: number;
    mode: "low_water" | "fast_shade" | "max_cooling" | "balanced";
    brief: string;
  }
): AsyncGenerator<AgentStep> {
  const agent = createUrbanCanopyAgent();

  if (!agent && params) {
    // Run direct autonomous pipeline
    yield* runAutonomousPipeline(
      params.city,
      params.lat,
      params.lon,
      params.budget,
      params.mode,
      params.brief
    );
    return;
  }

  if (!agent) {
    yield* runAutonomousPipeline(
      "Phoenix, AZ",
      33.4484,
      -112.074,
      250000,
      "balanced",
      userMessage
    );
    return;
  }

  // LLM agent available
  yield {
    type: "progress",
    message: "🧠 LangGraph Agent analyzing brief...",
    stepIndex: 0,
  };

  let stepIndex = 1;

  try {
    const stream = agent.stream(
      { messages: [{ role: "human", content: userMessage }] },
      { recursionLimit: 25 }
    );

    for await (const chunk of await stream) {
      if ("agent" in chunk) {
        const messages = chunk.agent.messages;
        for (const msg of messages) {
          if (msg.content && typeof msg.content === "string" && msg.content.length > 0) {
            yield {
              type: "message",
              message: msg.content,
              stepIndex,
            };
          }
          if (Array.isArray(msg.tool_calls)) {
            for (const tc of msg.tool_calls) {
              const toolLabels: Record<string, string> = {
                fetch_heatmap: "🌡️ Fetching temperature heatmap...",
                fetch_satellite: "🛰️ Analyzing satellite imagery...",
                fetch_env_params: "🌤️ Fetching environmental data...",
                analyze_hotspots: "🔍 Identifying heat hotspots...",
                optimize_interventions: "🌳 Optimizing intervention layout...",
                simulate_cooling: "🧮 Running thermal simulation...",
                calculate_irrigation: "💧 Calculating irrigation schedules...",
                generate_report: "📊 Compiling blueprint report...",
              };

              yield {
                type: "progress",
                message: toolLabels[tc.name] || `⚙️ Running ${tc.name}...`,
                stepIndex,
              };
            }
          }
        }
      }

      if ("tools" in chunk) {
        const messages = chunk.tools.messages;
        for (const msg of messages) {
          if (msg.content) {
            try {
              const result =
                typeof msg.content === "string" ? JSON.parse(msg.content) : msg.content;
              if (result.summary) {
                yield {
                  type: "tool_result",
                  message: result.summary,
                  data: result,
                  stepIndex,
                };
              }
            } catch {
              // Non-JSON
            }
          }
        }
      }

      stepIndex++;
    }

    yield {
      type: "complete",
      message: "✅ Blueprint complete! Review the results on the map and dashboard.",
      stepIndex,
    };
  } catch (error: unknown) {
    console.warn("LangGraph LLM stream exception, seamlessly executing live FortyGuard pipeline:", (error as Error).message);
    yield {
      type: "progress",
      message: "⚡ Orchestrating FortyGuard live thermal planning pipeline...",
      stepIndex,
    };
    for await (const step of runAutonomousPipeline(
      params?.city || "Phoenix, AZ",
      params?.lat || 33.4484,
      params?.lon || -112.074,
      params?.budget || 250000,
      params?.mode || "balanced",
      params?.brief || userMessage
    )) {
      yield step;
    }
  }
}

export function buildPlanningPrompt(
  userBrief: string,
  city: string,
  lat: number,
  lon: number,
  budget: number,
  mode: "low_water" | "fast_shade" | "max_cooling" | "balanced"
): string {
  return `
I need an urban cooling blueprint for ${city}.

Center coordinates: ${lat}, ${lon}
Budget: $${budget.toLocaleString()} USD
Priority mode: ${mode}

User brief: "${userBrief}"

Please execute the complete planning workflow:
1. Fetch the temperature heatmap
2. Get satellite land-cover segmentation
3. Get environmental parameters
4. Identify top heat hotspots
5. Optimize intervention layout within $${budget.toLocaleString()}
6. Run before/after thermal simulation
7. Generate irrigation plan
8. Compile final blueprint report
`.trim();
}
