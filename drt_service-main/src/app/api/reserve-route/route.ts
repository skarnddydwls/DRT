import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/config/backend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      route_id,
      dispatch_dt,
      point_id,
      dispatch_seq,
      device_id,
      ext_dispatch_div,
    } = body;
    if (
      !route_id ||
      !dispatch_dt ||
      !point_id ||
      dispatch_seq == null ||
      !device_id ||
      !ext_dispatch_div
    ) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const response = await fetch(`${BACKEND_BASE_URL}/updateReserveRoute.do`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ROUTE_ID: route_id,
        DISPATCH_DT: dispatch_dt,
        POINT_ID: point_id,
        DISPATCH_SEQ: dispatch_seq,
        DEVICE_ID: device_id,
        EXT_DISPATCH_DIV: ext_dispatch_div,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Backend request failed" },
        { status: response.status }
      );
    }

    const text = await response.text();
    return NextResponse.json(text ? JSON.parse(text) : { success: true });
  } catch (error) {
    console.error("Reserve route API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
