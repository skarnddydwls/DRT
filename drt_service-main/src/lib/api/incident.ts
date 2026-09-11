/**
 * 사고(Incident) 이력 관련 API 함수
 */

import { post } from "@/lib/api/client";
import type { IncidentFilters, IncidentRow } from "@/types/incident";

/**
 * 사고 이력 목록 조회 API
 */
export async function getIncidentHistoryList(
  filters: IncidentFilters
): Promise<IncidentRow[]> {
  const data = await post<{
    incidents?: Array<Record<string, unknown>>;
  }>("/api/incident/history", {
    filters,
  });

  return (data.incidents ?? []).map((item) => ({
    occurred_dtm: String(item.occurred_dtm ?? item.occurredDate ?? ""),
    vehicle_no: String(item.vehicle_no ?? item.vehicleNo ?? ""),
    incident_type: String(item.incident_type ?? item.incidentType ?? ""),
    latitude: Number(item.latitude ?? item.lat ?? 0),
    longitude: Number(item.longitude ?? item.lng ?? 0),
    description: String(item.description ?? item.details ?? ""),
  }));
}
