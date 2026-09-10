import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/config/backend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    if (!body.COMMON_CODE) {
      return NextResponse.json(
        { error: "COMMON_CODE is required" },
        { status: 400 }
      );
    }

    const response = await fetch(`${BACKEND_BASE_URL}/selectDetailCode.do`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Backend request failed" },
        { status: response.status }
      );
    }

    const data: unknown = await response.json();
    if (!Array.isArray(data)) {
      return NextResponse.json(
        { error: "Invalid backend response format" },
        { status: 502 }
      );
    }

    return NextResponse.json({ codes: data, total: data.length });
  } catch (error) {
    console.error("Detail code API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
