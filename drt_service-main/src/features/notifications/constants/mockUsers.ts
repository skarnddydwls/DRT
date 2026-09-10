import type { TargetUser } from "@/types/notificationSend";

export const MOCK_USERS: TargetUser[] = [
  // 승객(고객) 목록
  {
    userId: "cust_001",
    userName: "김민수",
    userType: "PASSENGER",
    phone: "010-2345-6789",
    subInfo: "최근 탑승: 2026-09-08 (순환A)",
  },
  {
    userId: "cust_002",
    userName: "이지원",
    userType: "PASSENGER",
    phone: "010-3456-7890",
    subInfo: "최근 탑승: 2026-09-09 (간선B)",
  },
  {
    userId: "cust_003",
    userName: "박서준",
    userType: "PASSENGER",
    phone: "010-4567-8901",
    subInfo: "최근 탑승: 2026-09-07 (직결C)",
  },
  {
    userId: "cust_004",
    userName: "최유진",
    userType: "PASSENGER",
    phone: "010-5678-9012",
    subInfo: "예약 대기중 (순환A)",
  },
  {
    userId: "cust_005",
    userName: "정다은",
    userType: "PASSENGER",
    phone: "010-6789-0123",
    subInfo: "최근 탑승: 2026-09-09 (외곽D)",
  },
  {
    userId: "cust_006",
    userName: "강현우",
    userType: "PASSENGER",
    phone: "010-7890-1234",
    subInfo: "최근 탑승: 2026-09-05 (간선B)",
  },
  {
    userId: "cust_007",
    userName: "윤서아",
    userType: "PASSENGER",
    phone: "010-8901-2345",
    subInfo: "최근 탑승: 2026-09-09 (순환A)",
  },
  {
    userId: "cust_008",
    userName: "한지훈",
    userType: "PASSENGER",
    phone: "010-9012-3456",
    subInfo: "최근 탑승: 2026-09-08 (순환A)",
  },
  {
    userId: "cust_009",
    userName: "송예은",
    userType: "PASSENGER",
    phone: "010-1122-3344",
    subInfo: "최근 탑승: 2026-09-07 (간선B)",
  },
  {
    userId: "cust_010",
    userName: "임도윤",
    userType: "PASSENGER",
    phone: "010-2233-4455",
    subInfo: "최근 탑승: 2026-09-06 (직결C)",
  },
  {
    userId: "cust_011",
    userName: "오하린",
    userType: "PASSENGER",
    phone: "010-3344-5566",
    subInfo: "최근 탑승: 2026-09-09 (순환A)",
  },
  {
    userId: "cust_012",
    userName: "배시우",
    userType: "PASSENGER",
    phone: "010-4455-6677",
    subInfo: "예약 대기중 (외곽D)",
  },

  // 기사 목록
  {
    userId: "driver_101",
    userName: "홍길동 기사",
    userType: "DRIVER",
    phone: "010-9123-4567",
    subInfo: "서울 70사 1234 (A노선 운행중)",
  },
  {
    userId: "driver_102",
    userName: "이영희 기사",
    userType: "DRIVER",
    phone: "010-9234-5678",
    subInfo: "서울 70사 5678 (B노선 대기)",
  },
  {
    userId: "driver_103",
    userName: "박철수 기사",
    userType: "DRIVER",
    phone: "010-9345-6789",
    subInfo: "경기 71가 3456 (C노선 운행중)",
  },
  {
    userId: "driver_105",
    userName: "임재범 기사",
    userType: "DRIVER",
    phone: "010-9567-8901",
    subInfo: "서울 72바 4567 (야간 대기)",
  },
];
