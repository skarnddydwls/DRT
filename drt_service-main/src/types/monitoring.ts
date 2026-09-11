/**
 * Monitoring 관련 타입 정의
 */

export interface RouteNode {
  point_type: "NODE" | "STN";
  point_id: string;
  route_id: string;
  required_min: number;
  gps_x: number;
  gps_y: number;
  point_seq: number;
  point_nm?: string | null;
  direction?: string | null;
  created_at: number;
  updated_at: number;
}

export interface RouteNodeResponse {
  nodes: RouteNode[];
  total: number;
}

export interface VehicleMarker {
  gps_x: number;
  gps_y: number;
  oper_dtm: number;
  heading: number;
  vehicle_no: string;
  vehicle_id: string;
  speed: number;
}

export interface VehicleMarkerResponse {
  vehicles: VehicleMarker[];
  total: number;
}

export interface ActiveRouteNode {
  route_id: string;
  route_nm: string | null;
  vehicle_id: string;
  point_id: string;
  point_seq: number;
  point_nm: string | null;
  point_type: "STN" | "NODE";
  ext_dispatch_div: string | null;
  gps_x: number;
  gps_y: number;
}

export interface ActiveRouteNodeResponse {
  nodes: ActiveRouteNode[];
  total: number;
}
