import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/config/backend";
import type { ReplacementExecutePayload } from "@/types/replacement-vehicle";

/**
 * 대차 실행 처리 API 핸들러
 * - 전자정부 백엔드로 대차 실행 요청을 전송합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const payload: ReplacementExecutePayload = await request.json().catch(() => ({}));

    // TODO: 백엔드 대차 실행 엔드포인트명 확정 시 교체 (예: /executeReplacementVehicle.do)
    const backendUrl = `${BACKEND_BASE_URL}/executeReplacementVehicle.do`;

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: "Backend request failed" },
        { status: response.status }
      );
    }

    const result = await response.json().catch(() => ({}));
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("[API /api/replacement-vehicle POST Error]:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
