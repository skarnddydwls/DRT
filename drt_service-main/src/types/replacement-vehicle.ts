// features/replacements/types.ts

// 운행 중인 차량 (원차량)
export interface ActiveVehicle {
  id: string;
  plate: string;
  driver: string;
  route: string;
  passengers: string;
  status: string;
}

// 대기 중인 대차 가능 차량
export interface StandbyVehicle {
  id: string;
  plate: string;
  driver: string;
  location: string;
  note?: string;
}

// 최종 대차 실행 폼 데이터
export interface ReplacementExecutePayload {
  originVehicleId: string;
  replaceVehicleId: string;
  reason: string;
  memo: string;
}