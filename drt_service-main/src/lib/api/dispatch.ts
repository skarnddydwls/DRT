/**
 * Dispatch 관련 API 함수
 * Next.js API Route를 통해 백엔드로 요청합니다.
 */

import { post } from "@/lib/api/client";
import type {
  DispatchListParams,
  DispatchListResponse,
  DispatchRow,
} from "@/types/dispatch";

/**
 * 배차 목록 조회 API
 * @param params 조회 파라미터
 * @returns 배차 목록 및 전체 개수
 */
export async function getDispatchList(
  params: DispatchListParams = {}
): Promise<DispatchListResponse> {
  const response = await post<DispatchListResponse>("/api/dispatch", params);

  console.log("[getDispatchList] raw response:", response.dispatches);

  const sortedDispatches = [...response.dispatches].sort((a, b) => {
    if (a.route_id === b.route_id) {
      return a.point_id.localeCompare(b.point_id);
    }
    return a.route_id.localeCompare(b.route_id);
  });

  return {
    ...response,
    dispatches: sortedDispatches,
  };
}

/**
 * 배차 상세 조회 API (추후 필요시 사용)
 */
export async function getDispatchById(
  dispatchSeq: number
): Promise<DispatchRow> {
  return post<DispatchRow>(`/api/dispatch/${dispatchSeq}`, {
    dispatch_seq: dispatchSeq,
  });
}

export interface DispatchTimeUpdatePayload {
  route_id: string;
  dispatch_dt: string;
  algh_dtm: string;
  old_vehicle_id: string;
  new_vehicle_id: string;
}

/**
 * 배차시간 편집 API
 * @param params 편집 파라미터
 */
export async function updateDispatchTime(
  params: DispatchTimeUpdatePayload
): Promise<void> {
  return post<void>("/api/updatetime", params);
}

export interface ReserveRouteUpdatePayload {
  route_id: string;
  dispatch_dt: string;
  point_id: string;
  dispatch_seq: number;
  device_id: string;
  ext_dispatch_div: string;
}

export interface ReserveRouteUpdateResponse {
  success: boolean;
  updatedCount: number;
}

export async function updateReserveRoute(
  params: ReserveRouteUpdatePayload
): Promise<ReserveRouteUpdateResponse> {
  return post<ReserveRouteUpdateResponse>("/api/reserve-route", params);
}

export async function importDispatchMaster(params: {
  dispatch_id: string;
  dispatch_dt: string;
}) {
  return post<{ success: boolean; updatedCount: number }>(
    "/api/dispatch/import-master",
    params
  );
}
