import { NextRequest, NextResponse } from 'next/server';
import { redisSimulationManager } from '@/lib/queue/redis-queue';

/**
 * PRD Section 6.3: POST /api/v1/simulation/simulate
 * Recomputes instant cooling metrics via the Redis simulation matrix,
 * driven by the UI tree density / budget slider in <50ms.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { job_id, tree_count, species_id, budget_usd } = body;

    if (!job_id) {
      return NextResponse.json(
        { error: 'Missing required field: job_id' },
        { status: 400 }
      );
    }

    const count = typeof tree_count === 'number' ? tree_count : 100;
    const budget = typeof budget_usd === 'number' ? budget_usd : 50000;

    const result = await redisSimulationManager.evaluateSimulation({
      jobId: job_id,
      treeCount: count,
      speciesId: species_id,
      budgetUsd: budget,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error('[POST /api/v1/simulation/simulate] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to evaluate simulation' },
      { status: 500 }
    );
  }
}
