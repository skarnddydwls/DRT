/**
 * Stop 관련 타입 정의
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StopRow = any;

export interface StopFilters {
  stopName: string;
}

export interface StopListResponse {
  stops: StopRow[];
  total: number;
}

export interface StopListParams {
  stopName?: string;
  page?: number;
  pageSize?: number;
}

