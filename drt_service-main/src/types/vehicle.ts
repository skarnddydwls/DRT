/**
 * Vehicle 관련 타입 정의
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type VehicleRow = any;

export interface VehicleFilters {
  vehicleNo: string;
}

export interface VehicleListResponse {
  vehicles: VehicleRow[];
  total: number;
}

export interface VehicleListParams {
  vehicleNo?: string;
  page?: number;
  pageSize?: number;
}

/**
 * 차량 폼 데이터 타입 (API 요청용)
 * 모든 필드는 대문자로 변환되어 백엔드로 전송됩니다.
 */
export interface VehicleFormData {
  VEHICLE_ID?: string; // 추가 모드에서는 빈 문자열로 전송
  VEHICLE_NO: string;
  AREA: string;
  CHASSIS_NO: string;
  VEHICLE_TYPE: string;
  VEHICLE_STATUS: string;
  MAKER: string;
  MODEL_NM: string;
  RELEASE_YEAR: string;
  FUEL_TYPE: string;
  START_DT: string; // YYYY-MM-DD 형식
  END_DT: string; // YYYY-MM-DD 형식
  CAPACITY: number;
  REMARK: string;
}
