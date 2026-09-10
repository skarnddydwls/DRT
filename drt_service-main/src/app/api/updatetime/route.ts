import { NextRequest, NextResponse } from "next/server";

import { BACKEND_BASE_URL } from "@/config/backend";

// 배차시간 업데이트 API
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    console.log("[api/updatetime] request body:", body);

    const { route_id, dispatch_dt, algh_dtm, old_vehicle_id, new_vehicle_id } =
      body;

    if (
      !route_id ||
      !dispatch_dt ||
      !algh_dtm ||
      !old_vehicle_id ||
      !new_vehicle_id
    ) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const response = await fetch(`${BACKEND_BASE_URL}/updateDispatch.do`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ROUTE_ID: route_id,
        DISPATCH_DT: dispatch_dt,
        ALGH_DTM: algh_dtm,
        OLD_VEHICLE_ID: old_vehicle_id,
        NEW_VEHICLE_ID: new_vehicle_id,
      }),
    });
    console.log(
      "[api/updatetime] backend status:",
      response.status,
      response.statusText
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Backend request failed" },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Dispatch time update API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

