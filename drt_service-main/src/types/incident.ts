// types/incident.ts
export interface IncidentFilters {
  occurredDate?: string; // 발생일 (YYYY-MM-DD)
  vehicleNo?: string;    // 차량번호
  incidentType?: string; // 유고 종류
}

export interface IncidentRow {
  incident_type_code: string;
  incident_id: string;
  vehicle_id: string;
  occurred_dtm: string;  // 발생일시 (2026-01-25 09:22:25)
  vehicle_no: string;    // 차량번호 (전남70자5014)
  incident_type: string; // 유고유형 (도로파손, 교통사고, 도로공사 등)
  latitude: number | null;      // 위치 미수신 신고는 null
  longitude: number | null;
  description: string;   // 상세설명 ('-')

  [key: string]: unknown;
}
