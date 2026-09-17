import type { FieldConfig } from "@/types/filterForm";
import type { StatsFilters } from "@/types/stats";

export const defaultStatsFilters: StatsFilters = {
  routeNm: "",
};

export const statsFields: FieldConfig[] = [
  {
    name: "routeNm",
    label: "노선명",
    type: "text",
    placeholder: "노선명을 입력하세요",
  },
];
