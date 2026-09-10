import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/config/backend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.dispatch_id || !body.dispatch_nm || !body.season_div || !body.day_div) {
      return NextResponse.json({ error: "Required fields are missing" }, { status: 400 });
    }
    const response = await fetch(`${BACKEND_BASE_URL}/saveDispatchMasterInfo.do`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        DISPATCH_ID: body.dispatch_id,
        DISPATCH_NM: body.dispatch_nm,
        SEASON_DIV: body.season_div,
        DAY_DIV: body.day_div,
        VALID_FROM: body.valid_from || null,
        VALID_TO: body.valid_to || null,
        USE_YN: body.use_yn || "Y",
        REMARK: body.remark || null,
      }),
    });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Dispatch master save API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
