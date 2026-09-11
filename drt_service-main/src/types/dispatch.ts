/**
 * Dispatch(배차) 관련 타입 정의
 */

export interface DispatchRow extends Record<string, unknown> {
  dispatch_seq: number;
  point_id: string;
  stn_nm: string;
  route_id: string;
  route_nm: string;
  algh_dtm: number;
  remark: string | null;
  dispatch_dt: number;
  vehicle_id: string;
  vehicle_no?: string | null;
  device_id?: string | null;
  ext_dispatch_yn?: string | null;
  ext_dispatch_div?: string | null;
}

export interface DispatchFilters {
  dispatchDate: string;
}

export interface DispatchListResponse {
  dispatches: DispatchRow[];
  total: number;
}

export interface DispatchListParams {
  dispatchDate?: string;
  DISPATCH_DT?: string;
  page?: number;
  pageSize?: number;
}

export interface DispatchStopEntry {
  point_id: string;
  stn_nm: string;
  algh_dtm: number | null;
  dispatch_seq: number;
  remark: string | null;
  ext_dispatch_yn: string | null;
  ext_dispatch_div: string | null;
}

export interface DispatchGridRow extends Record<string, unknown> {
  dispatch_dt: number;
  route_id: string;
  route_nm: string;
  vehicle_id: string;
  vehicle_no?: string | null;
  device_id?: string | null;
  stops: DispatchStopEntry[];
}
