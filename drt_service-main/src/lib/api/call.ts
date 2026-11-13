/**
 * Call 관련 API 함수
 * Next.js API Route를 통해 백엔드로 요청합니다.
 */

import { post } from "@/lib/api/client";
import type { CallListParams, CallListResponse, CallRow } from "@/types/call";

/**
 * 호출기록 목록 조회 API
 * @param params 조회 파라미터
 * @returns 호출기록 목록 및 전체 개수
 */
export async function getCallList(
  params: CallListParams = {}
): Promise<CallListResponse> {
  return post<CallListResponse>("/api/calls", params);
}

export async function cancelCall(row: CallRow): Promise<{ success: boolean; alreadyCancelled?: boolean }> {
  const response = await fetch("/api/calls/cancel", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ DEVICE_ID: row.device_id, CALL_DTM: row.call_dtm }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success)
    throw new Error(data?.error || "취소 결과를 확인하지 못했습니다. 다시 조회해주세요.");
  return data;
}

/**
 * 호출기록 상세 조회 API (추후 필요시 사용)
 */
export async function getCallById(id: string): Promise<CallRow> {
  return post<CallRow>(`/api/calls/${id}`, { call_id: id });
}
