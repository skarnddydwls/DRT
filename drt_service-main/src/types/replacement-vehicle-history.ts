export interface ReplacementVehicleFilters {
    replacementDate?: string;
}

export interface ReplacementVehicleRow {
  replace_dtm: string;      // 대차일시
  origin_vehicle_id: string;// 원차량 아이디 (또는 차량번호)
  replace_vehicle_id: string;// 대차차량 아이디 (또는 차량번호)
  status: string;           // 대차 상태 (대기, 진행중, 완료, 취소 등)
  reason: string;           // 사유
  
  [key: string]: unknown;
}