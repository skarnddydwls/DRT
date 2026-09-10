import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/config/backend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${BACKEND_BASE_URL}/saveRouteNodeList.do`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: "Backend request failed" },
        { status: response.status }
      );
    }

    const text = await response.text();
    if (!text) return NextResponse.json({ success: true });
    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      return NextResponse.json({ success: true, message: text });
    }
  } catch (error) {
    console.error("Route node save API error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
