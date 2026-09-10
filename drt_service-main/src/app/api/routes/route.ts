import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/config/backend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const response = await fetch(`${BACKEND_BASE_URL}/selectRouteList.do`, {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any[] = await response.json();

    console.log("Route backend response:", JSON.stringify(data, null, 2));

    return NextResponse.json({ routes: data, total: data.length });
  } catch (error) {
    console.error("Route API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
