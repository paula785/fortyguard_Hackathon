import { NextRequest, NextResponse } from 'next/server';
import { postgisClient } from '@/lib/db/postgis-client';
import { diagnosticWorker } from '@/lib/queue/diagnostic-worker';

/**
 * PRD Section 6.1: POST /api/v1/analysis/start
 * Starts a diagnostic job and triggers spatial data aggregation for a given AOI.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { project_name, polygon_aoi, target_date, granularity } = body;

    if (!polygon_aoi || !polygon_aoi.coordinates || polygon_aoi.coordinates.length === 0) {
      return NextResponse.json(
        { error: 'Invalid polygon_aoi payload. GeoJSON Polygon required.' },
        { status: 400 }
      );
    }

    const job = await postgisClient.createJob({
      projectName: project_name || 'Urban Microclimate Study',
      polygonAoi: polygon_aoi,
      targetDate: target_date || new Date().toISOString(),
      granularity: granularity || 100,
      estimatedDurationSec: 25,
    });

    // Fire background diagnostic pipeline asynchronously
    diagnosticWorker.runDiagnosticPipeline(job.id).catch((err) => {
      console.error(`[AnalysisStart] Worker error for job ${job.id}:`, err);
    });

    return NextResponse.json(
      {
        job_id: job.id,
        status: 'PROCESSING',
        estimated_duration_sec: job.estimated_duration_sec,
      },
      { status: 202 }
    );
  } catch (err: any) {
    console.error('[POST /api/v1/analysis/start] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to initialize analysis job' },
      { status: 500 }
    );
  }
}
