import { NextRequest, NextResponse } from 'next/server';
import { postgisClient } from '@/lib/db/postgis-client';

/**
 * PRD Section 6.2: GET /api/v1/analysis/status/{job_id}
 * Polls the current stage and progress of the ingestion / optimization pipeline.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ job_id: string }> }
) {
  try {
    const { job_id } = await params;
    const job = await postgisClient.getJob(job_id);

    if (!job) {
      return NextResponse.json(
        { error: `Job with ID '${job_id}' not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      job_id: job.id,
      stage: job.stage,
      progress_percentage: job.progress_percentage,
      errors: job.errors,
      completed_at: job.completed_at,
    });
  } catch (err: any) {
    console.error('[GET /api/v1/analysis/status] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to retrieve job status' },
      { status: 500 }
    );
  }
}
