import { post } from "@/lib/api/client";
import type {
  OperLogListParams,
  OperLogListResponse,
  OperLogRow,
} from "@/types/operLog";

export async function getOperLogList(
  params: OperLogListParams = {}
): Promise<OperLogListResponse> {
  return post<OperLogListResponse>("/api/selectOperLogList", params);
}

export async function getOperLogById(id: string): Promise<OperLogRow> {
  return post<OperLogRow>(`/api/selectOperLogList/${id}`, { id });
}

