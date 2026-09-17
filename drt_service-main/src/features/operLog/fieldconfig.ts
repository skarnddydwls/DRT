import type { FieldConfig } from "@/types/filterForm";
import type { OperLogFilters } from "@/types/operLog";

export const defaultFilters: OperLogFilters = {
  operDate: "",
  routeNm: "",
  vehicleNo: "",
};

export const operLogFields: FieldConfig[] = [
  {
    name: "operDate",
    label: "운행일",
    type: "date",
    placeholder: "YYYY-MM-DD",
  },
  {
    name: "routeNm",
    label: "노선명",
    type: "text",
    placeholder: "노선명",
  },
  {
    name: "vehicleNo",
    label: "차량번호",
    type: "text",
    placeholder: "차량번호",
  },
];
