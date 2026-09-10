export interface NotificationFilters {
    notificationDate?: string;
}

export interface NotificationRow {
    noti_dtm: string; // 알림전송일시 (2026-01-25 09:22:25)
    noti_type: string;
    noti_title: string; // 알림제목
    noti_target: string;
    noti_content: string; // 내용

    [key: string]: unknown;
}