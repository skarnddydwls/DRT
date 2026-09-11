/**
 * 대체 차량(Replacement Vehicle) 관련 API 함수
 */

import { get, post } from "@/lib/api/client";
import type {
  ReplacementVehicleFilters,
  ReplacementVehicleRow,
} from "@/types/replacement-vehicle-history";
import type {
  ActiveVehicle,
  StandbyVehicle,
  ReplacementExecutePayload,
} from "@/types/replacement-vehicle";

export interface ReplacementVehicleDataResponse {
  activeVehicles: ActiveVehicle[];
  standbyVehicles: StandbyVehicle[];
  isMock?: boolean;
}

export interface ReplacementExecuteResponse {
  success: boolean;
  message?: string;
  isMock?: boolean;
}

/**
 * 대체 차량 이력 목록 조회 API
 */
export async function getReplacementVehicleHistoryList(
  filters: ReplacementVehicleFilters
): Promise<ReplacementVehicleRow[]> {
  const data = await post<{
    replacements?: Array<Record<string, unknown>>;
  }>("/api/replacement-vehicle/history", {
    filters,
  });

  return (data.replacements ?? []).map((item) => ({
    replace_dtm: String(item.replacement_date ?? ""),
    origin_vehicle_id: String(item.origin_vehicle_id ?? ""),
    replace_vehicle_id: String(item.replace_vehicle_id ?? ""),
    status: String(item.replacement_status ?? ""),
    reason: String(item.replacement_reason ?? ""),
  }));
}

/**
 * 대차 관리 화면 초기 차량 목록 조회 (운행 중 차량 + 대차 가능 차량)
 */
export async function getReplacementVehicleData(): Promise<ReplacementVehicleDataResponse> {
  return get<ReplacementVehicleDataResponse>("/api/replacement-vehicle");
}

/**
 * 대차 실행 처리 API
 */
export async function executeReplacement(
  payload: ReplacementExecutePayload
): Promise<ReplacementExecuteResponse> {
  return post<ReplacementExecuteResponse>("/api/replacement-vehicle", payload);
}

