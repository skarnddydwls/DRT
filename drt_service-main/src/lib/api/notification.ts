/**
 * 알림(Notification) 관련 API 함수
 * - 알림 발송 및 알림 발송 이력 조회
 */

import { post } from "@/lib/api/client";
import type { NotificationSendFormState } from "@/types/notificationSend";
import type { NotificationFilters, NotificationRow } from "@/types/notification";
import { formatNotificationTime } from "@/features/notifications/formatNotificationTime";

export interface SendNotificationResponse {
  result?: unknown;
  success?: boolean;
  queuedCount?: number;
  skippedCount?: number;
  notificationId?: string;
  status?: string;
}

/**
 * 알림 발송 API
 */
export async function sendNotification(
  payload: NotificationSendFormState
): Promise<SendNotificationResponse> {
  const response = await fetch("/api/notifications/send", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || data.success !== true) throw new Error(data.error || "알림 전송 요청에 실패했습니다.");
  return data as SendNotificationResponse;
}

/**
 * 알림 이력 목록 조회 API
 */
export async function getNotificationHistoryList(
  filters: NotificationFilters
): Promise<NotificationRow[]> {
  const data = await post<{
    notifications?: Array<Record<string, unknown>>;
  }>("/api/notifications/history", {
    filters,
  });

  return (data.notifications ?? []).map((item) => ({
    noti_dtm: formatNotificationTime(item.noti_dtm),
    noti_type: String(item.noti_type ?? ""),
    noti_target: String(item.noti_target ?? ""),
    noti_title: String(item.noti_title ?? ""),
    noti_content: String(item.noti_content ?? ""),
    send_status: String(item.send_status ?? ""),
  }));
}
