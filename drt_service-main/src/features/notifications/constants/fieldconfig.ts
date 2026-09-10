import type { FieldConfig } from "@/types/filterForm";
import type { NotificationFilters } from "@/types/notification";

export const defaultNotificationFields: NotificationFilters = {
  notificationDate: "",
};

export const notificationFields: FieldConfig[] = [
  {
    name: "notificationDate",
    label: "알림일시",
    type: "date",
    placeholder: "연도-월-일",
  },
];