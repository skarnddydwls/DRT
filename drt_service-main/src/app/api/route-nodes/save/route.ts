import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/config/backend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${BACKEND_BASE_URL}/saveRouteNodeList.do`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: "Backend request failed" },
        { status: response.status }
      );
    }

    const text = await response.text();
    if (!text) return NextResponse.json({ success: false, message: "저장 결과를 확인할 수 없습니다." }, { status: 502 });
    try {
      const data = JSON.parse(text);
      if (data?.success !== true) return NextResponse.json({ success: false, message: "노선 저장 결과를 확인할 수 없습니다." }, { status: 502 });
      return NextResponse.json(data);
    } catch {
      return NextResponse.json({ success: false, message: "노선 저장 서버 응답을 확인할 수 없습니다." }, { status: 502 });
    }
  } catch (error) {
    console.error("Route node save API error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
