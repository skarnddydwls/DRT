import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/config/backend";
import type { TargetUser } from "@/types/notificationSend";
import type { UserListParams, UserListResponse } from "@/lib/api/user";

/**
 * 사용자 목록 조회 API 핸들러
 * - 전자정부 백엔드와 연동하여 실제 사용자(기사/승객) 목록을 조회합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const params: UserListParams = await request.json().catch(() => ({}));

    // TODO: 백엔드 전자정부 컨트롤러 URL이 다른 경우 수정 (기본값: /selectUserList.do)
    const response = await fetch(`${BACKEND_BASE_URL}/selectUserList.do`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Backend request failed", users: [], total: 0 },
        { status: response.status }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawData: any = await response.json();

    // 백엔드 응답 형태가 배열이거나 { users: [...] } 또는 { data: [...] } 형태일 경우 모두 대응
    const rawList: any[] = Array.isArray(rawData)
      ? rawData
      : Array.isArray(rawData?.users)
        ? rawData.users
        : Array.isArray(rawData?.data)
          ? rawData.data
          : [];

    // TargetUser 규격으로 정제 매핑
    const normalizedUsers: TargetUser[] = rawList.map((item) => ({
      userId: String(item.userId ?? item.user_id ?? item.id ?? ""),
      userName: String(item.userName ?? item.user_name ?? item.name ?? ""),
      userType: (item.userType ?? item.user_type) === "DRIVER" ? "DRIVER" : "PASSENGER",
      phone: item.phone ?? item.tel_no ?? item.user_phone,
      subInfo: item.subInfo ?? item.sub_info ?? item.remark,
    }));

    return NextResponse.json<UserListResponse>({
      users: normalizedUsers,
      total: normalizedUsers.length,
    });
  } catch (error) {
    console.error("[API /api/users POST Error]:", error);
    return NextResponse.json(
      { error: "Internal server error", users: [], total: 0 },
      { status: 500 }
    );
  }
}
