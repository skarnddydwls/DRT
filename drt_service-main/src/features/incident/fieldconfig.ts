import type { FieldConfig } from "@/types/filterForm";
import type { IncidentFilters } from "@/types/incident";

export const defaultIncidentFilters: IncidentFilters = {
  occurredDate: "",
  vehicleNo: "",
};

export const incidentFields: FieldConfig[] = [
  {
    name: "occurredDate",
    label: "발생일",
    type: "date",
    placeholder: "연도-월-일",
  },
  {
    name: "vehicleNo",
    label: "차량번호",
    type: "text",
    placeholder: "차량번호",
  },
];