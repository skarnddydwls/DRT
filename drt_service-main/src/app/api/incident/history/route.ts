import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/config/backend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const response = await fetch(
      `${BACKEND_BASE_URL}/selectIncidentList.do`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body.filters ?? body),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      }
    );

    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json(
        { error: typeof data === "object" && data !== null && "error" in data ? String(data.error) : "유고정보 이력을 조회하지 못했습니다." },
        { status: response.status }
      );
    }

    if (!Array.isArray(data)) return NextResponse.json({ error: "유고정보 서버 응답을 확인할 수 없습니다." }, { status: 502 });
    return NextResponse.json({ incidents: data, total: data.length });
  } catch (error) {
    console.error("Incident API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
