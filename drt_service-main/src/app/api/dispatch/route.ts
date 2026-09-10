import { NextRequest, NextResponse } from "next/server";

import { BACKEND_BASE_URL } from "@/config/backend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const response = await fetch(`${BACKEND_BASE_URL}/selectDispatchList.do`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Backend request failed" },
        { status: response.status }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await response.json();

    if (!Array.isArray(data)) {
      return NextResponse.json(
        { error: "Invalid backend response format" },
        { status: 502 }
      );
    }

    console.log("[api/dispatch] raw backend data:", data);

    const sortedData = [...data].sort((a, b) => {
      const dispatchCompare =
        Number(b.dispatch_dt ?? 0) - Number(a.dispatch_dt ?? 0);
      if (dispatchCompare !== 0) {
        return dispatchCompare;
      }

      const routeCompare = String(a.route_id ?? "").localeCompare(
        String(b.route_id ?? "")
      );
      if (routeCompare !== 0) {
        return routeCompare;
      }

      return Number(a.dispatch_seq ?? 0) - Number(b.dispatch_seq ?? 0);
    });

    return NextResponse.json({
      dispatches: sortedData,
      total: sortedData.length,
    });
  } catch (error) {
    console.error("Dispatch API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
