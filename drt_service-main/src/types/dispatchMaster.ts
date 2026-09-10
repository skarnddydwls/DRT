export type SeasonDiv = "CD001" | "CD002";
export type DayDiv = "CD001" | "CD002" | "CD003";

export interface DispatchMasterInfo extends Record<string, unknown> {
  dispatch_id: string;
  dispatch_nm: string;
  season_div: SeasonDiv;
  day_div: DayDiv;
  season_nm?: string;
  day_nm?: string;
  valid_from: number | string | null;
  valid_to: number | string | null;
  use_yn: "Y" | "N";
  remark: string | null;
  detail_count?: number;
}

export interface DispatchMasterRow extends Record<string, unknown> {
  dispatch_id: string;
  route_id: string;
  route_nm: string | null;
  point_id: string;
  point_nm: string | null;
  dispatch_seq: number;
  device_id: string;
  ext_dispatch_div: string | null;
  algh_dtm: number | string | null;
  remark: string | null;
}

export interface DispatchMasterStop {
  point_id: string;
  point_nm: string;
  dispatch_seq: number;
  device_id: string;
  algh_dtm: number | string | null;
  ext_dispatch_div: string | null;
}

export interface DispatchMasterGridRow extends Record<string, unknown> {
  route_id: string;
  route_nm: string;
  stops: DispatchMasterStop[];
}

export interface DispatchMasterSavePayload {
  dispatch_id: string;
  dispatch_nm: string;
  season_div: SeasonDiv;
  day_div: DayDiv;
  valid_from: string;
  valid_to: string;
  use_yn: "Y" | "N";
  remark: string;
}
