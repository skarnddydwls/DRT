import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/config/backend";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  try {
    if (!origin || new URL(origin).host !== (request.headers.get("host") ?? request.nextUrl.host)
      || !["http:", "https:"].includes(new URL(origin).protocol)) {
      return NextResponse.json({ error: "센터 화면에서 요청해주세요." }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "요청 주소를 확인해주세요." }, { status: 403 });
  }
  try {
    const body = await request.json();
    const response = await fetch(`${BACKEND_BASE_URL}/cancelCenterReservation.do`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ DEVICE_ID: body.DEVICE_ID, CALL_DTM: body.CALL_DTM }), cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    if (!data) return NextResponse.json({ error: "예약 서버 응답을 확인하지 못했습니다. 다시 조회해주세요." }, { status: 502 });
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "취소 결과를 확인하지 못했습니다. 다시 조회해 예약 상태를 확인해주세요." }, { status: 502 });
  }
}
