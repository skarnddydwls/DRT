import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/config/backend";

export async function POST(request: NextRequest) {
  // Browser writes must originate from this center, not another website.
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin && origin !== `${new URL(request.url).protocol}//${request.headers.get("host")}`) {
    return NextResponse.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
  }
  try {
    const body: unknown = await request.json();
    const response = await fetch(`${BACKEND_BASE_URL}/manageCommonCode.do`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      cache: "no-store", signal: AbortSignal.timeout(15000),
    });
    const result: unknown = await response.json().catch(() => null);
    if (!response.ok) return NextResponse.json({ error: typeof result === "object" && result !== null && "error" in result ? String(result.error) : "코드 변경에 실패했습니다." }, { status: response.status });
    if (typeof result !== "object" || result === null || !("success" in result) || result.success !== true) return NextResponse.json({ error: "코드 저장 응답을 확인할 수 없습니다. 새로고침 후 결과를 확인해주세요." }, { status: 502 });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "코드 서버 응답을 받지 못했습니다. 재시도 전 새로고침하여 결과를 확인해주세요." }, { status: 502 });
  }
}
