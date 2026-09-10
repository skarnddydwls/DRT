/**
 * Route 페이지 필터 폼 관련 설정
 */

import type { FieldConfig } from "@/types/filterForm";
import type { RouteFilters } from "@/types/route";

export const defaultFilters: RouteFilters = {
  routeName: "",
};

export const routeFields: FieldConfig[] = [
  {
    name: "routeName",
    label: "노선명",
    type: "text",
    placeholder: "노선명",
  },
];


