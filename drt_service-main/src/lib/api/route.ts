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

export interface RouteCreatePayload {
  ROUTE_NM: string;
  O_STN_ID: string;
  D_STN_ID: string;
  START_DT: string;
  END_DT: string;
  USE_YN: "Y" | "N";
  REMARK: string;
}

export async function manageRoute(payload: (RouteCreatePayload & { action: "insert" }) | { action: "delete"; ROUTE_ID: string }) {
  const response = await fetch("/api/routes/manage", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.error || "노선을 처리하지 못했습니다.");
  return data as { success: boolean; route_id?: string; deletedCount?: number };
}
