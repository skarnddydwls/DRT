import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/config/backend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${BACKEND_BASE_URL}/selectDispatchMasterInfoList.do`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        SEASON_DIV: body.season_div,
        DAY_DIV: body.day_div,
      }),
    });
    if (!response.ok) return NextResponse.json({ error: "Backend request failed" }, { status: response.status });
    const data = await response.json();
    return NextResponse.json({ masters: Array.isArray(data) ? data : [] });
  } catch (error) {
    console.error("Dispatch master info API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
