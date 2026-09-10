export interface OperLogRow extends Record<string, unknown> {
  route_id: string;
  route_nm: string;
  vehicle_id: string;
  vehicle_no: string;
  oper_dtm: number;
  dispatch_dt: number;
  gps_x: number;
  gps_y: number;
  heading: number;
  speed: number;
}

export interface OperLogFilters {
  operDate?: string;
  routeNm?: string;
  vehicleNo?: string;
}

export interface OperLogListResponse {
  logs: OperLogRow[];
  total: number;
}

export interface OperLogListParams {
  operDate?: string;
  routeNm?: string;
  vehicleNo?: string;
  page?: number;
  pageSize?: number;
}

