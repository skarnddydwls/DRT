/**
 * Route 관련 API 함수
 * Next.js API Route를 통해 백엔드로 요청합니다.
 */

import { post } from "@/lib/api/client";
import type {
  RouteListParams,
  RouteListResponse,
  RouteRow,
} from "@/types/route";

/**
 * 노선 목록 조회 API
 * @param params 조회 파라미터
 * @returns 노선 목록 및 전체 개수
 */
export async function getRouteList(
  params: RouteListParams = {}
): Promise<RouteListResponse> {
  return post<RouteListResponse>("/api/routes", params);
}

/**
 * 노선 상세 조회 API (추후 필요시 사용)
 */
export async function getRouteById(id: string): Promise<RouteRow> {
  return post<RouteRow>(`/api/routes/${id}`, { route_id: id });
}
