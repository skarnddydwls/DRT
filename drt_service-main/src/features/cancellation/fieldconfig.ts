import type { FieldConfig } from "@/types/filterForm";
import type { CancellationFilters } from "@/types/cancellation";

export const defaultCancellationFilters: CancellationFilters = {
  cancellationDate: "",
  plannedDate: "",
  shipNm: "",
  routeNm: "",
};

export const cancellationFields: FieldConfig[] = [
  {
    name: "cancellationDate",
    label: "최초 확인일",
    type: "date",
    placeholder: "연도-월-일",
  },
  { name: "plannedDate", label: "운행예정일", type: "date", placeholder: "연도-월-일" },
  { name: "shipNm", label: "선박명", type: "text", placeholder: "선박명" },
  { name: "routeNm", label: "운항명", type: "text", placeholder: "운항명" },
];
