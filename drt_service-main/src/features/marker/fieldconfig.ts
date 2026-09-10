import type { FieldConfig } from "@/types/filterForm";
import type { MarkerFilters } from "@/types/marker";

export const defaultFilters: MarkerFilters = {
  nodeName: "",
};

export const markerFields: FieldConfig[] = [
  {
    name: "nodeName",
    label: "노드명",
    type: "text",
    placeholder: "노드명",
  },
];
