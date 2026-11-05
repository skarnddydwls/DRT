import type { FieldConfig } from "@/types/filterForm";
import type { OperLogFilters } from "@/types/operLog";

const todayInKorea = new Date(Date.now() + 9 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

export const defaultFilters: OperLogFilters = {
  operDate: todayInKorea,
  startTime: "00:00",
  endTime: "23:59",
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
    name: "startTime",
    label: "시작 시간",
    type: "time",
  },
  {
    name: "endTime",
    label: "종료 시간",
    type: "time",
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
