import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/config/backend";
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${BACKEND_BASE_URL}/${body.dispatch_id ? 'updateDispatchMasterTransfer' : 'updateDispatchTransfer'}.do`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        DISPATCH_ID: body.dispatch_id, DISPATCH_DT: body.dispatch_dt,
        ROUTE_ID: body.route_id, POINT_ID: body.point_id, DISPATCH_SEQ: body.dispatch_seq,
        DEVICE_ID: body.device_id,
        TRANSFER_ENABLED: true, TRANSFER_MINUTES: 3,
      }),
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch { return NextResponse.json({ error: "환승 설정을 저장하지 못했습니다." }, { status: 500 }); }
}
