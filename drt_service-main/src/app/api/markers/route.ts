import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/config/backend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    // 정류장 데이터 요청인 경우
    if (body.type === "stops") {
      const response = await fetch(`${BACKEND_BASE_URL}/selectStationList.do`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      console.log(response, "11111111")
      if (!response.ok) {
        return NextResponse.json(
          { error: "Backend request failed" },
          { status: response.status }
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any[] = await response.json();

      console.log(
        "Station list backend response:",
        JSON.stringify(data, null, 2)
      );

      return NextResponse.json({
        stops: data,
        total: data.length,
      });
    }

    // 노드 마커 데이터 요청
    const response = await fetch(`${BACKEND_BASE_URL}/selectNodeList.do`, {
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

    console.log("Node list backend response:", JSON.stringify(data, null, 2));

    return NextResponse.json({
      markers: data,
      total: data.length,
    });
  } catch (error) {
    console.error("Marker API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
