export type NotificationTargetType = "ALL_PASSENGER" | "ALL_DRIVER" | "SPECIFIC_USER";

export type UserCategory = "ALL" | "PASSENGER" | "DRIVER";

export interface TargetUser {
  userId: string;
  userName: string;
  userType: "PASSENGER" | "DRIVER";
  phone?: string;
  subInfo?: string; // 차량번호, 소속 노선 등 부가정보
}

export interface NotificationSendFormState {
  notificationType: string;        // 알림 유형
  targetType: NotificationTargetType; // 알림 대상
  targetUserId: string;            // 특정 사용자 아이디 (단일 호환용)
  targetUserIds: string[];         // 선택된 사용자 아이디 목록
  title: string;                   // 제목
  content: string;                 // 내용
}