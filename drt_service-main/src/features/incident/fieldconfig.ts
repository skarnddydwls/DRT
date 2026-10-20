import type { FieldConfig } from "@/types/filterForm";
import type { IncidentFilters } from "@/types/incident";

export const defaultIncidentFilters: IncidentFilters = {
  occurredDate: "",
  vehicleNo: "",
  incidentType: "",
};

export const incidentFields: FieldConfig[] = [
  {
    name: "incidentType",
    label: "유고 종류",
    type: "text",
    placeholder: "종류 검색",
  },
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
