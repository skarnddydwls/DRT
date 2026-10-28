import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/config/backend";

export async function POST(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/selectDispatchCalendar.do`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(await request.json()), cache: "no-store", signal: AbortSignal.timeout(15000),
    });
    return new NextResponse(await response.text(), { status: response.status, headers: { "Content-Type": "application/json" } });
  } catch {
    return NextResponse.json({ error: "계절 구분을 불러오지 못했습니다." }, { status: 502 });
  }
}
