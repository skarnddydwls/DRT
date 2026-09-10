import { NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/config/backend";

export async function POST() {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/selectActiveRouteNodeList.do`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (!response.ok) return NextResponse.json({ error: "Backend request failed" }, { status: response.status });
    const data = await response.json();
    return NextResponse.json({ nodes: Array.isArray(data) ? data : [], total: Array.isArray(data) ? data.length : 0 });
  } catch (error) {
    console.error("Active route node API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
