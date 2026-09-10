import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/config/backend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const response = await fetch(
      `${BACKEND_BASE_URL}/selectReplacementVehicleHistoryList.do`, // 백엔드 API 엔드포인트
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body.filters ?? body),
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Backend request failed" },
        { status: response.status }
      );
    }

    const data: any[] = await response.json();

    return NextResponse.json({ replacements: data, total: data.length });
  } catch (error) {
    console.error("Replacement vehicle history API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}