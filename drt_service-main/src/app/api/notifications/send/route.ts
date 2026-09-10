import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/config/backend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    // 실제 백엔드 전자정부 컨트롤러 엔드포인트에 맞게 URL 수정 필요 (예: /sendNotification.do 또는 /insertNotification.do)
    const response = await fetch(
      `${BACKEND_BASE_URL}/sendNotification.do`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Backend request failed" },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({ result: data, success: true });
  } catch (error) {
    console.error("Notification Send API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}