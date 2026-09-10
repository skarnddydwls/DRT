/**
 * Call 관련 타입 정의
 */

export interface CallRow extends Record<string, unknown> {
  dispatch_seq: number;
  route_id: string;
  route_nm: string;
  device_id: string;
  call_dtm: string;
  start_point_id: string;
  start_point_nm: string;
  end_point_id: string;
  end_point_nm: string;
  rsv_num: number;
  curren_reserved: number;
  payment: string;
  gps_x: number;
  gps_y: number;
  dispatch_dt: number;
}

export interface CallFilters {
  callDatetime?: string;
  routeNm?: string;
  startPointNm?: string;
  endPointNm?: string;
}

export interface CallListResponse {
  calls: CallRow[];
  total: number;
}

export interface CallListParams {
  callDatetime?: string;
  routeNm?: string;
  startPointNm?: string;
  endPointNm?: string;
  page?: number;
  pageSize?: number;
}
