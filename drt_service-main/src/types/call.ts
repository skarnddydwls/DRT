/**
 * Call 관련 타입 정의
 */

export interface CallRow extends Record<string, unknown> {
  leg_count?: number;
  journey_route_nm?: string | null;
  rsv_status?: string | null;
  cancel_reason?: string | null;
  nickname?: string | null;
  schedule_ride_dtm?: string | null;
  schedule_algh_dtm?: string | null;
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

export interface CallJourneyLeg {
 leg_seq:number; route_id:string;route_nm:string;vehicle_id:string;vehicle_no:string;
 start_point_id:string;start_point_nm:string;start_direction?:string|null;
 end_point_id:string;end_point_nm:string;end_direction?:string|null;
 dispatch_dt:string;schedule_ride_dtm:string;schedule_algh_dtm:string;
}
export interface CallJourneyResponse {
 reservation:{device_id:string;call_dtm:string;rsv_num:number;rsv_status:string|null;nickname:string|null;arrival_completed_at:string|null};
 legs:CallJourneyLeg[];
}