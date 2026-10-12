/**
 * 대체 차량(Replacement Vehicle) 관련 API 함수
 */

import { post } from "@/lib/api/client";
import { getVehicleList } from "@/lib/api/vehicle";
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
}

export interface ReplacementExecuteResponse {
  success: boolean;
  message?: string;
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
 * 대차 관리 화면 차량 목록 조회
 * - /api/vehicles (/selectVehicleList.do)를 조회하여 운행 차량과 대차 가능(대기) 차량으로 분류 및 정제합니다.
 */
export async function getReplacementVehicleData(): Promise<ReplacementVehicleDataResponse> {
  const response = await getVehicleList();
  const rawList = response.vehicles ?? [];

  const activeVehicles: ActiveVehicle[] = [];
  const standbyVehicles: StandbyVehicle[] = [];

  rawList.forEach((v: any, index: number) => {
    const id = String(v.vehicle_id ?? v.VEHICLE_ID ?? `V-${index + 1}`);
    const plate = String(v.vehicle_no ?? v.VEHICLE_NO ?? "");
    const status = String(v.vehicle_status || v.VEHICLE_STATUS || "대기");
    const driver = String(v.driver_name ?? v.driver ?? v.DRV_NM ?? "기사 미배정");
    const route = String(v.route_name ?? v.route ?? v.area ?? "일반 노선");
    const passengers = String(v.passengers ?? v.passenger_cnt ?? "0명");
    const location = String(v.location ?? v.area ?? v.remark ?? "차고지 대기");


    // 상태값이 '운행' 또는 '운행중'인 경우 교체 대상(원차량), 그 외는 대차 가능 차량으로 분류
    if (status.includes("운행") || status.toUpperCase() === "OPERATING" || status.toUpperCase() === "RUNNING") {
      activeVehicles.push({
        id,
        plate,
        driver,
        route,
        passengers,
        status: status || "운행중",
      });
    } else {
      standbyVehicles.push({
        id,
        plate,
        driver,
        location,
      });
    }
  });

  return { activeVehicles, standbyVehicles };
}

/**
 * 대차 실행 처리 API
 */
export async function executeReplacement(
  payload: ReplacementExecutePayload
): Promise<ReplacementExecuteResponse> {
  return post<ReplacementExecuteResponse>("/api/replacement-vehicle", payload);
}
