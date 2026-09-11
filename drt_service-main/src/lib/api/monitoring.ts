/**
 * Monitoring 관련 API 함수
 */

import { get, post } from "@/lib/api/client";
import type {
  RouteNodeResponse,
  VehicleMarkerResponse,
  ActiveRouteNodeResponse,
} from "@/types/monitoring";

/**
 * 노선 노드 목록 조회 API
 * @returns 노선 노드 목록 및 전체 개수
 */
export async function getRouteNodes(
  params: { ROUTE_ID?: string } = {}
): Promise<RouteNodeResponse> {
  return post<RouteNodeResponse>("/api/route-nodes", params);
}

export async function getActiveRouteNodes(): Promise<ActiveRouteNodeResponse> {
  return post<ActiveRouteNodeResponse>("/api/active-route-nodes", {});
}

/**
 * 버스 마커 목록 조회 API
 * @returns 버스 마커 목록 및 전체 개수
 */
export async function getVehicleMarkers(): Promise<VehicleMarkerResponse> {
  return post<VehicleMarkerResponse>("/api/vehicle-markers", {});
}

export interface BusArrivalItem {
  routeNo: string;
  routeType: string;
  arrivalSeconds: number;
  remainingStops: number;
  vehicleType: string;
}

export interface BusArrivalsResponse {
  arrivals?: BusArrivalItem[];
  message?: string;
  error?: string;
}

/**
 * 정류장 버스 도착 예정 정보 (BIT) 조회 API
 */
export async function getBusArrivals(
  stationNo: string
): Promise<BusArrivalsResponse> {
  return get<BusArrivalsResponse>(
    `/api/bus-arrivals?stationNo=${encodeURIComponent(stationNo)}`
  );
}

