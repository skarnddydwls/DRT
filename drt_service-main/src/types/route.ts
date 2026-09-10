/**
 * Route 관련 타입 정의
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RouteRow = any;

export interface RouteFilters {
  routeName: string;
}

export interface RouteListResponse {
  routes: RouteRow[];
  total: number;
}

export interface RouteListParams {
  routeName?: string;
  page?: number;
  pageSize?: number;
}
