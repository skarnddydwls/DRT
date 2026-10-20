import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/config/backend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const response = await fetch(`${BACKEND_BASE_URL}/selectCommonList.do`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return NextResponse.json({ error: "공통코드를 불러오지 못했습니다." }, { status: response.status });
    const codes: unknown = await response.json();
    if (!Array.isArray(codes)) return NextResponse.json({ error: "공통코드 응답을 확인할 수 없습니다." }, { status: 502 });
    return NextResponse.json({ codes, total: codes.length });
  } catch {
    return NextResponse.json({ error: "공통코드 서버에 연결하지 못했습니다." }, { status: 502 });
  }
}
