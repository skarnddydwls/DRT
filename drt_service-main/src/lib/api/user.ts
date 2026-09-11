/**
 * 사용자(기사/승객) 관련 API 클라이언트 함수
 * Next.js API Route (/api/users)를 통해 백엔드 전자정부 프레임워크와 통신함
 */

import { post } from "@/lib/api/client";
import type { TargetUser } from "@/types/notificationSend";

// 요청 파라미터 DTO (검색 필터 조건)
// 나중에 백엔드가 검색어(keyword)나 기사/승객 구분(userType) 지원할 때 대비용
export interface UserListParams {
    userType?: "ALL" | "PASSENGER" | "DRIVER";
    searchKeyword?: string;
}

// 서버 응답 DTO
// API 응답으로 유저 배열(users)과 전체 카운트(total)를 받겠다는 약속
export interface UserListResponse {
    users: TargetUser[];
    total: number;
}

/**
 * 사용자 목록 조회 API 함수
 * @param params 검색/필터 옵션 (기본값은 빈 객체 {})
 * @returns Promise<UserListResponse>
 */
export async function getUserList(
    params: UserListParams = {}
): Promise<UserListResponse> {
    // /api/users 엔드포인트로 POST 날리고 응답을 UserListResponse 타입으로 파싱!
    return post<UserListResponse>("/api/users", params);
}
