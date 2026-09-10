// types/incident.ts
export interface IncidentFilters {
  occurredDate?: string; // 발생일 (YYYY-MM-DD)
  vehicleNo?: string;    // 차량번호
}

export interface IncidentRow {
  occurred_dtm: string;  // 발생일시 (2026-01-25 09:22:25)
  vehicle_no: string;    // 차량번호 (전남70자5014)
  incident_type: string; // 유고유형 (도로파손, 교통사고, 도로공사 등)
  latitude: number;      // 위도 (34.536363)
  longitude: number;     // 경도 (127.709096)
  description: string;   // 상세설명 ('-')

  [key: string]: unknown;
}