/**
 * Stop 관련 API 함수
 * Next.js API Route를 통해 백엔드로 요청합니다.
 */

import { post } from "@/lib/api/client";
import type {
  StopListParams,
  StopListResponse,
  StopRow,
} from "@/types/stop";

/**
 * 정류장 목록 조회 API
 * @param params 조회 파라미터
 * @returns 정류장 목록 및 전체 개수
 */
export async function getStopList(
  params: StopListParams = {}
): Promise<StopListResponse> {
  return post<StopListResponse>("/api/stops", params);
}

/**
 * 정류장 상세 조회 API (추후 필요시 사용)
 */
export async function getStopById(id: string): Promise<StopRow> {
  return post<StopRow>(`/api/stops/${id}`, { stn_id: id });
}

