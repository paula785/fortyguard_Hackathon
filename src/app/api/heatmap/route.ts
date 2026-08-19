// ─── Heatmap API Route ────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { fortyguard, buildAOIFromCenter, getYesterdayDate } from "@/lib/fortyguard-client";
import type { GeoJSONFeatureCollection } from "@/lib/fortyguard-types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lat, lon, radius_km, polygon_aoi, date, filter_type, start_time, granularity } = body;

    let aoi: GeoJSONFeatureCollection;
    if (polygon_aoi) {
      aoi = polygon_aoi;
    } else if (lat && lon) {
      aoi = buildAOIFromCenter(lat, lon, radius_km || 2);
    } else {
      return NextResponse.json({ error: "Provide lat/lon or polygon_aoi" }, { status: 400 });
    }

    const result = await fortyguard.createHeatmap({
      polygon_aoi: aoi,
      date_time: {
        start_date: date || getYesterdayDate(),
        filter_type: filter_type || 3,
        start_time: start_time,
      },
      granularity: granularity || 100,
      analytic_type: "tcm",
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
