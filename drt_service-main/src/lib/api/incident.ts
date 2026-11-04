/**
 * 사고(Incident) 이력 관련 API 함수
 */

import { post } from "@/lib/api/client";
import type { IncidentFilters, IncidentRow } from "@/types/incident";

/**
 * 사고 이력 목록 조회 API
 */
export async function getIncidentHistoryList(
  filters: IncidentFilters,
  kind: "incident" | "breakdown" = "incident"
): Promise<IncidentRow[]> {
  const data = await post<{
    incidents?: Array<Record<string, unknown>>;
  }>(kind === "breakdown" ? "/api/breakdown/history" : "/api/incident/history", {
    filters,
  });

  return (data.incidents ?? []).map((item) => ({
    incident_id: String(item.incident_id ?? ""),
    incident_type_code: String(item.incident_type_code ?? ""),
    vehicle_id: String(item.vehicle_id ?? ""),
    occurred_dtm: String(item.occurred_dtm ?? item.occurredDate ?? ""),
    vehicle_no: String(item.vehicle_no ?? item.vehicleNo ?? ""),
    incident_type: String(item.incident_type ?? item.incidentType ?? ""),
    latitude: Number(item.gps_y ?? item.latitude ?? item.lat ?? NaN),
    longitude: Number(item.gps_x ?? item.longitude ?? item.lng ?? NaN),
    description: String(item.description ?? item.details ?? ""),
  }));
}
