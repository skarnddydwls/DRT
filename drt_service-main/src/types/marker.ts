/**
 * Marker 관련 타입 정의
 */

export interface MarkerRow {
  node_id: string;
  node_nm: string;
  gps_x: number;
  gps_y: number;
  use_yn?: string;
  [key: string]: unknown;
}

export interface MarkerFilters {
  nodeName?: string;
}

export interface MarkerListResponse {
  markers: MarkerRow[];
  total: number;
}

export interface MarkerListParams {
  nodeName?: string;
  page?: number;
  pageSize?: number;
}
