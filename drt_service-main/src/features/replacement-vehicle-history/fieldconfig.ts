// features/replacement-vehicle/fieldconfig.ts
import type { ReplacementVehicleFilters } from "@/types/replacement-vehicle-history";
import type { FieldConfig } from "@/types/filterForm";


export const defaultReplacementFields: ReplacementVehicleFilters = {
  replacementDate: "",
};

export const replacementVehicleFields: FieldConfig[] = [
  {
    name: "replacementDate",
    label: "대차일자",
    type: "date",
    placeholder: "연도-월-일",
  },
];