import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/config/backend";
import { allowCenterRequest } from "@/features/tourism/requestOrigin";

export async function POST(request: NextRequest) {
  try {
    if (!allowCenterRequest(request.headers.get("origin"), request.headers.get("host") ?? request.nextUrl.host, request.nextUrl.protocol, process.env.CENTER_ALLOWED_ORIGINS)) {
      return NextResponse.json({ error: "허용되지 않은 센터 주소입니다. CENTER_ALLOWED_ORIGINS 설정을 확인해주세요." }, { status: 403 });
    }
    const body = await request.json().catch(() => ({}));

    const response = await fetch(
      `${BACKEND_BASE_URL}/${body.action === "listFerrySailings" ? "selectCenterFerrySailings.do" : "sendNotification.do"}`,
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
