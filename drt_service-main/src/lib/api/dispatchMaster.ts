import { post } from "@/lib/api/client";
import type {
  DayDiv,
  DispatchMasterInfo,
  DispatchMasterRow,
  DispatchMasterSavePayload,
  SeasonDiv,
} from "@/types/dispatchMaster";

export async function getDispatchMasterInfos(params: {
  season_div: SeasonDiv;
  day_div: DayDiv;
}) {
  return post<{ masters: DispatchMasterInfo[] }>("/api/dispatch-master/info", params);
}

export async function getDispatchMasterRows(dispatchId: string) {
  return post<{ dispatches: DispatchMasterRow[] }>("/api/dispatch-master/detail", {
    dispatch_id: dispatchId,
  });
}

export async function saveDispatchMasterInfo(payload: DispatchMasterSavePayload) {
  return post<{ success: boolean; updatedCount: number }>(
    "/api/dispatch-master/info/save",
    payload
  );
}

export async function updateDispatchMasterReserveRoute(payload: {
  dispatch_id: string;
  route_id: string;
  point_id: string;
  dispatch_seq: number;
  device_id: string;
  ext_dispatch_div: string;
}) {
  return post<{ success: boolean; updatedCount: number }>(
    "/api/dispatch-master/reserve-route",
    payload
  );
}

export async function updateDispatchMasterTime(payload: {
  dispatch_id: string;
  route_id: string;
  point_id: string;
  dispatch_seq: number;
  device_id: string;
  algh_tm: string;
}) {
  return post<{ success: boolean; updatedCount: number }>(
    "/api/dispatch-master/time",
    payload
  );
}

export async function refreshDispatchMasterSchedule(dispatchId: string) {
  return post<{ success: boolean; updatedCount: number }>(
    "/api/dispatch-master/refresh-schedule",
    { dispatch_id: dispatchId }
  );
}
