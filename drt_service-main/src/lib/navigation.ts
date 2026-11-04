// Shared by the header and home page so their links and names stay in sync.
export const menuGroups = [
  {
    label: "운영관리",
    description: "차량과 정류장부터 노선 구성, 배차와 현장 대응까지 관리합니다.",
    items: [
      ["/vehicle", "차량관리", "차량 기본 정보와 차량 상태를 관리합니다."],
      ["/stop", "정류장관리", "정류장 정보와 위치, 운행 방향을 관리합니다."],
      ["/tourism", "주변 관광지 관리", "정류장 주변 관광지 정보를 관리합니다."],
      ["/route", "노선관리", "노선을 등록하고 기본 정보를 관리합니다."],
      ["/route-edit", "노선편집", "하계·동계, 평일·주말별 정류장과 지점 순서를 편집합니다."],
      ["/notification-send", "알림전송", "등록된 기기로 안내와 푸시 알림을 전송합니다."],
      ["/replacement-vehicle", "대차관리", "원차량과 대체 차량을 선택하고 대차를 처리합니다."],
      ["/dispatch-master", "배차마스터", "계절·요일별 기준 배차표와 예약구간, 환승을 설정합니다."],
      ["/dispatch", "일배차관리", "배차마스터를 불러와 일자별 배차표를 관리합니다."],
      ["/cancellation-dispatch", "결항 대응 배차 설정", "여객선 결항에 대응할 배차 규칙과 정류장별 시간을 설정합니다."],
    ],
  },
  {
    label: "실시간 관제",
    description: "지도에서 차량 위치와 운행 상황을 확인합니다.",
    items: [
      ["/monitoring", "모니터링", "카카오지도에서 차량 위치와 운행 노선, 예약구간을 확인합니다."],
    ],
  },
  {
    label: "이력·통계",
    description: "운행과 현장 대응 이력을 조회하고 호출 현황을 분석합니다.",
    items: [
      ["/calls", "호출기록", "승객 호출 내역을 조회합니다."],
      ["/selectOperLogList", "운행기록", "운행 기록과 당시 차량 위치, 노선을 지도에서 확인합니다."],
      ["/incident-history", "유고정보 이력", "유고 종류와 발생 시각, 위치를 확인합니다."],
      ["/breakdown-history", "고장 이력", "차량 고장 종류와 발생 내역을 확인합니다."],
      ["/notification-history", "알림전송 이력", "알림 전송 내역과 전송 시각을 조회합니다."],
      ["/replacement-vehicle-history", "대차이력", "차량 대차 처리 내역을 조회합니다."],
      ["/cancellation-history", "결항정보 이력", "여객선 결항 정보와 발생 이력을 확인합니다."],
      ["/stats", "호출통계", "차트로 호출 현황과 통계를 확인합니다."],
    ],
  },
  {
    label: "환경설정",
    description: "운영 화면에서 사용하는 공통코드와 상세코드를 관리합니다.",
    items: [
      ["/common-code", "공통코드 관리", "공통코드와 하위 상세코드를 등록·수정·삭제합니다."],
    ],
  },
] as const;
