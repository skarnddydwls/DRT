import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/config/backend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.dispatch_id) return NextResponse.json({ error: "dispatch_id is required" }, { status: 400 });
    const response = await fetch(`${BACKEND_BASE_URL}/selectDispatchMasterList.do`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ DISPATCH_ID: body.dispatch_id }),
    });
    if (!response.ok) return NextResponse.json({ error: "Backend request failed" }, { status: response.status });
    const data = await response.json();
    return NextResponse.json({ dispatches: Array.isArray(data) ? data : [] });
  } catch (error) {
    console.error("Dispatch master detail API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
