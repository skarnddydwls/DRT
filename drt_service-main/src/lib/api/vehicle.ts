/**
 * Vehicle 관련 API 함수
 * Next.js API Route를 통해 백엔드로 요청합니다.
 */

import { post } from "@/lib/api/client";
import type {
  VehicleFormData,
  VehicleListParams,
  VehicleListResponse,
  VehicleRow,
} from "@/types/vehicle";

/**
 * 차량 목록 조회 API
 * @param params 조회 파라미터
 * @returns 차량 목록 및 전체 개수
 */
export async function getVehicleList(
  params: VehicleListParams = {}
): Promise<VehicleListResponse> {
  return post<VehicleListResponse>("/api/vehicles", params);
}

/**
 * 차량 상세 조회 API (추후 필요시 사용)
 */
export async function getVehicleById(id: string): Promise<VehicleRow> {
  return post<VehicleRow>(`/api/vehicles/${id}`, { vehicle_id: id });
}

/**
 * 차량 추가 API
 * @param data 차량 정보
 */
export async function insertVehicle(
  data: VehicleFormData
): Promise<void> {
  return post<void>("/api/vehicles/insert", data);
}

/**
 * 차량 수정 API
 * @param data 차량 정보 (VEHICLE_ID 포함)
 */
export async function updateVehicle(
  data: VehicleFormData
): Promise<void> {
  return post<void>("/api/vehicles/update", data);
}

/**
 * 차량 삭제 API
 * @param vehicleId 차량 ID
 */
export async function deleteVehicle(vehicleId: string): Promise<void> {
  return post<void>("/api/vehicles/delete", { VEHICLE_ID: vehicleId });
}
