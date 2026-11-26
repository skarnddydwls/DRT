import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/config/backend";
import { allowCenterRequest } from "@/features/tourism/requestOrigin";
export async function POST(request: NextRequest) {
  if (!allowCenterRequest(request.headers.get("origin"), request.headers.get("host") ?? request.nextUrl.host, request.nextUrl.protocol, process.env.CENTER_ALLOWED_ORIGINS)) return NextResponse.json({ error: "허용되지 않은 센터 주소입니다." }, { status: 403 });
  try {
    const body = await request.json();
    const response = await fetch(`${BACKEND_BASE_URL}/admin/ferryTimetable.do`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
    const data = await response.json().catch(() => ({ error: "여객선 시간표 서버 응답을 확인할 수 없습니다." }));
    return NextResponse.json(data, { status: response.status });
  } catch { return NextResponse.json({ error: "여객선 시간표 서버에 연결하지 못했습니다." }, { status: 502 }); }
}
