import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/config/backend";
import { allowTourismRequest as allowCenterRequest } from "@/features/tourism/requestOrigin";

export async function POST(request: NextRequest) {
  try {
    if (!allowCenterRequest(request.headers.get("origin"), request.headers.get("host") ?? request.nextUrl.host, request.nextUrl.protocol)) {
      return NextResponse.json({ error: "로컬 센터에서만 알림을 발송할 수 있습니다." }, { status: 403 });
    }
    const body = await request.json().catch(() => ({}));

    const response = await fetch(
      `${BACKEND_BASE_URL}/sendNotification.do`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json().catch(() => ({ error: "알림 서버 응답을 확인할 수 없습니다." }));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Notification Send API error:", error);
    return NextResponse.json(
      { error: "알림 서버에 연결하지 못했습니다." },
      { status: 500 }
    );
  }
}
