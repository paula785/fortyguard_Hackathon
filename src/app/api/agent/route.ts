// ─── Agent SSE Streaming API Route ────────────────────────────────────────────
import { NextRequest } from "next/server";
import { runAgentStream, buildPlanningPrompt } from "@/lib/agent/graph";

export const runtime = "nodejs";
export const maxDuration = 180; // 3 minutes

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { brief, city, lat, lon, budget, mode } = body;

  if (!brief || !lat || !lon || !budget) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
  }

  const message = buildPlanningPrompt(
    brief,
    city || "Phoenix, AZ",
    lat,
    lon,
    budget,
    mode || "balanced"
  );

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const step of runAgentStream(message, {
          city: city || "Phoenix, AZ",
          lat,
          lon,
          budget,
          mode: mode || "balanced",
          brief,
        })) {
          const data = `data: ${JSON.stringify(step)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
      } catch (err: unknown) {
        const errMsg = `data: ${JSON.stringify({ type: "error", message: (err as Error).message })}\n\n`;
        controller.enqueue(encoder.encode(errMsg));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
