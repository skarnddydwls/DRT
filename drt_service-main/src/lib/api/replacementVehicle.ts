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
 * - 원차량은 운행 차량 및 상태가 정상인 차량을 포함합니다. 대차 목록의 기존 분류는 유지합니다.
 */
export async function getReplacementVehicleData(): Promise<ReplacementVehicleDataResponse> {
  const response = await getVehicleList();
  const rawList = response.vehicles ?? [];

  const activeVehicles: ActiveVehicle[] = [];
  const standbyVehicles: StandbyVehicle[] = [];

  rawList.forEach((v: Record<string, unknown>, index: number) => {
    const id = String(v.vehicle_id ?? v.VEHICLE_ID ?? `V-${index + 1}`);
    const plate = String(v.vehicle_no ?? v.VEHICLE_NO ?? "");
    const status = String(v.vehicle_status || v.VEHICLE_STATUS || "대기");
    const driver = String(v.driver_name ?? v.driver ?? v.DRV_NM ?? "기사 미배정");
    const route = String(v.route_name ?? v.route ?? v.area ?? "일반 노선");
    const passengers = String(v.passengers ?? v.passenger_cnt ?? "0명");
    const location = String(v.location ?? v.area ?? v.remark ?? "차고지 대기");


    const normalizedStatus = status.trim().toUpperCase();
    const operating = status.includes("운행") || normalizedStatus === "OPERATING" || normalizedStatus === "RUNNING";
    // VEHICLE_STATUS의 CD001은 정상. 운행 여부와 관계없이 원차량으로 선택할 수 있다.
    const normal = normalizedStatus === "CD001" || normalizedStatus === "정상";
    if (operating || normal) {
      activeVehicles.push({
        id,
        plate,
        driver,
        route,
        passengers,
        status: normal ? "정상" : status,
      });
    }
    if (!operating) {
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
