import { post } from "@/lib/api/client";
import type { RouteNodeResponse } from "@/types/monitoring";

export async function getRouteNodesForEdit(params: {
  ROUTE_ID: string;
}): Promise<RouteNodeResponse> {
  return post<RouteNodeResponse>("/api/route-nodes", params);
}

export interface SaveRouteNodeItem {
  POINT_ID: string | null;
  POINT_NM: string;
  POINT_SEQ: number;
  POINT_TYPE: "NODE" | "STN";
  REQUIRED_MIN: number;
  GPS_X: number;
  GPS_Y: number;
}

export interface SaveRouteNodesParams {
  ROUTE_ID: string;
  NODE_LIST: SaveRouteNodeItem[];
}

export async function saveRouteNodes(
  params: SaveRouteNodesParams
): Promise<{ success?: boolean; message?: string }> {
  return post<{ success?: boolean; message?: string }>(
    "/api/route-nodes/save",
    params
  );
}
