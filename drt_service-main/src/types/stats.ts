/**
 * Stats (호출 통계) 관련 타입 정의
 */

export interface StatsRow extends Record<string, unknown> {
  route_id: string;
  route_nm: string;
  total_calls: number;
  card_calls: number;
  cash_calls: number;
}

export interface StatsFilters {
  routeNm?: string;
  startDate?: string;
  endDate?: string;
}

export interface StatsListResponse {
  stats: StatsRow[];
  total: number;
}

export interface StatsListParams {
  routeNm?: string;
  startDate?: string;
  endDate?: string;
}
