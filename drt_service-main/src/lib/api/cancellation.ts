/**
 * 결항(Cancellation) 이력 관련 API 함수
 */

import { post } from "@/lib/api/client";
import type { CancellationFilters, CancellationRow } from "@/types/cancellation";

export interface CancellationHistoryParams {
  filters?: CancellationFilters;
}

export interface CancellationHistoryResponse {
  cancellations: CancellationRow[];
  total?: number;
}

/**
 * 결항 이력 목록 조회 API
 */
export async function getCancellationHistoryList(
  filters: CancellationFilters
): Promise<CancellationRow[]> {
  const data = await post<{
    cancellations?: Array<Record<string, unknown>>;
  }>("/api/cancellation/history", {
    filters,
  });

  return (data.cancellations ?? []).map((item) => ({
    operation_div_nm: String(item.operation_div_nm ?? ""),
    cancel_dtm: String(item.cancel_dtm ?? item.operation_date ?? ""),
    plan_dtm: String(item.plan_dtm ?? item.scheduled_time ?? ""),
    ship_nm: String(item.ship_nm ?? ""),
    start_port_nm: String(item.start_port_nm ?? ""),
    end_port_nm: String(item.end_port_nm ?? ""),
    cancel_reason: String(item.cancel_reason ?? item.reason ?? ""),
  }));
}
