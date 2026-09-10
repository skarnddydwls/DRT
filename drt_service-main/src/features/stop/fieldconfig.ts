/**
 * Stop 페이지 필터 폼 관련 설정
 */

import type { FieldConfig } from "@/types/filterForm";
import type { StopFilters } from "@/types/stop";

export const defaultFilters: StopFilters = {
  stopName: "",
};

export const stopFields: FieldConfig[] = [
  {
    name: "stopName",
    label: "정류장명",
    type: "text",
    placeholder: "정류장명",
  },
];

