import { post } from "@/lib/api/client";
import type { MarkerListParams, MarkerListResponse } from "@/types/marker";

export async function getMarkerList(
  params: MarkerListParams = {}
): Promise<MarkerListResponse> {
  return post<MarkerListResponse>("/api/markers", params);
}

export interface StopRow {
  stn_no: string;
  start_dt: number;
  stn_nm: string;
  end_dt: number;
  gps_x: number;
  gps_y: number;
  remark: string;
  stn_type: string;
  stn_id: string;
  direction?: string;
}

export interface StopListResponse {
  stops: StopRow[];
  total: number;
}

export async function getStopList(): Promise<StopListResponse> {
  return post<StopListResponse>("/api/markers", { type: "stops" });
}
