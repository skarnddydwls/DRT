import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/config/backend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.dispatch_id || !body.route_id || !body.point_id || body.dispatch_seq == null || !body.device_id || !body.algh_tm) {
      return NextResponse.json({ error: "Required fields are missing" }, { status: 400 });
    }
    const response = await fetch(`${BACKEND_BASE_URL}/updateDispatchMasterTime.do`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        DISPATCH_ID: body.dispatch_id,
        ROUTE_ID: body.route_id,
        POINT_ID: body.point_id,
        DISPATCH_SEQ: body.dispatch_seq,
        DEVICE_ID: body.device_id,
        ALGH_TM: body.algh_tm,
      }),
    });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Dispatch master time API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
