/**
 * Stats 관련 API 함수
 * Next.js API Route를 통해 백엔드로 요청합니다.
 */

import { post } from "@/lib/api/client";
import type {
  StatsListParams,
  StatsListResponse,
  StatsRow,
} from "@/types/stats";

/**
 * 호출 통계 조회 API
 * @param params 조회 파라미터
 * @returns 호출 통계 목록 및 전체 개수
 */
export async function getStatsList(
  params: StatsListParams = {}
): Promise<StatsListResponse> {
  return post<StatsListResponse>("/api/stats", params);
}

/**
 * 노선별 호출 통계 조회 API (추후 필요시 사용)
 */
export async function getStatsByRouteId(
  routeId: string
): Promise<StatsRow> {
  return post<StatsRow>(`/api/stats/${routeId}`, { route_id: routeId });
}
