import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/config/backend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const response = await fetch(
      `${BACKEND_BASE_URL}/selectFerryCancellationList.do`, // 실제 백엔드 API 엔드포인트
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body.filters ?? body),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) {
      const failure: unknown = await response.json().catch(() => null);
      return NextResponse.json(
        { error: typeof failure === "object" && failure !== null && "error" in failure ? String(failure.error) : "결항정보 이력을 조회하지 못했습니다." },
        { status: response.status }
      );
    }

    const data: unknown = await response.json();
    if (!Array.isArray(data)) return NextResponse.json({ error: "결항정보 서버 응답을 확인할 수 없습니다." }, { status: 502 });

    return NextResponse.json({ cancellations: data, total: data.length });
  } catch (error) {
    console.error("Ferry cancellation API error:", error);
    return NextResponse.json(
      { error: "결항정보 서버에 연결하지 못했습니다. 잠시 후 다시 조회해주세요." },
      { status: 500 }
    );
  }
}
