import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/config/backend";

export async function POST(request: NextRequest) {
  try {
    const { action, ...body } = await request.json();
    if (action !== "insert" && action !== "delete") {
      return NextResponse.json({ error: "올바르지 않은 요청입니다." }, { status: 400 });
    }
    const response = await fetch(`${BACKEND_BASE_URL}/${action === "insert" ? "insertRoute" : "deleteRoute"}.do`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store",
    });
    const data = await response.json().catch(() => ({ error: "노선 처리에 실패했습니다. 백엔드 적용 상태를 확인해주세요." }));
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "백엔드 서버에 연결할 수 없습니다." }, { status: 502 });
  }
}
