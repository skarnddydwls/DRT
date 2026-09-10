/**
 * Dispatch 페이지 필터 폼 관련 설정
 */

import { formatTimestamp } from "@/lib/utils";
import type { FieldConfig } from "@/types/filterForm";
import type { DispatchFilters } from "@/types/dispatch";

const today = formatTimestamp(Date.now(), "YYYY-MM-DD");

export const defaultFilters: DispatchFilters = {
  dispatchDate: today,
};

export const dispatchFields: FieldConfig[] = [
  {
    name: "dispatchDate",
    label: "배차일자",
    type: "date",
  },
];
