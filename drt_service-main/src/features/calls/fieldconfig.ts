/**
 * Call 페이지 필터 폼 관련 설정
 */

import type { FieldConfig } from "@/types/filterForm";
import type { CallFilters } from "@/types/call";

export const defaultFilters: CallFilters = {
  callDatetime: "",
  routeNm: "",
  startPointNm: "",
  endPointNm: "",
};

export const callFields: FieldConfig[] = [
  {
    name: "callDatetime",
    label: "호출일",
    type: "date",
    placeholder: "호출일자",
  },
  {
    name: "routeNm",
    label: "노선명",
    type: "text",
    placeholder: "노선명",
  },
  {
    name: "startPointNm",
    label: "승차정류장",
    type: "text",
    placeholder: "승차정류장명",
  },
  {
    name: "endPointNm",
    label: "하차정류장",
    type: "text",
    placeholder: "하차정류장명",
  },
];
