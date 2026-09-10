/**
 * Vehicle 페이지 필터 폼 관련 설정
 */

import type { FieldConfig } from "@/types/filterForm";
import type { VehicleFilters } from "@/types/vehicle";

export const defaultFilters: VehicleFilters = {
  vehicleNo: "",
};

export const vehicleFields: FieldConfig[] = [
  {
    name: "vehicleNo",
    label: "차량번호",
    type: "text",
    placeholder: "차량번호",
  },
];
