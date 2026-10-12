import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/config/backend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.dispatch_id) {
      return NextResponse.json({ error: "dispatch_id is required" }, { status: 400 });
    }

    const response = await fetch(`${BACKEND_BASE_URL}/refreshDispatchMasterSchedule.do`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ DISPATCH_ID: body.dispatch_id }),
    });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Dispatch master schedule refresh API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
