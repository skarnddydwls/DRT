import type { FieldConfig } from "@/types/filterForm";
import type { CancellationFilters } from "@/types/cancellation";

export const defaultCancellationFilters: CancellationFilters = {
  cancellationDate: "",
};

export const cancellationFields: FieldConfig[] = [
  {
    name: "cancellationDate",
    label: "최초 확인일",
    type: "date",
    placeholder: "연도-월-일",
  },
];
