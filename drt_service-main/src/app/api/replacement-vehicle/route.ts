import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/config/backend";
import type {
  ActiveVehicle,
  StandbyVehicle,
  ReplacementExecutePayload,
} from "@/types/replacement-vehicle";

// 백엔드 연동 전까지 안전하게 프론트엔드를 구동시킬 초기 Mock 데이터
const FALLBACK_ACTIVE_VEHICLES: ActiveVehicle[] = [
  { id: "V-001", plate: "전남70바5011", driver: "김철수", route: "금오도 1코스 (여천항-직포)", passengers: "3명", status: "운행중" },
  { id: "V-002", plate: "전남70자5014", driver: "박영진", route: "금오도 2코스 (남면소재지)", passengers: "1명", status: "운행중" },
  { id: "V-003", plate: "전남70바5022", driver: "이민호", route: "여천항 연계 직통 노선", passengers: "0명", status: "운행중" },
];

const FALLBACK_STANDBY_VEHICLES: StandbyVehicle[] = [
  { id: "V-008", plate: "전남70바5088", driver: "정대리 (대기조)", location: "남면 차고지" },
  { id: "V-009", plate: "전남70자5099", driver: "송기사 (순환조)", location: "여천항 대기소" },
];

/**
 * 대차 관리 차량 목록 조회 (운행 차량 + 대기 차량)
 */
export async function GET() {
  try {
    // TODO: 백엔드 대차 관리 조회 엔드포인트명 확정 시 교체 (예: /selectReplacementVehicleList.do)
    const backendUrl = `${BACKEND_BASE_URL}/selectReplacementVehicleList.do`;

    try {
      const response = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        const rawData = await response.json();
        return NextResponse.json({
          activeVehicles: rawData.activeVehicles ?? [],
          standbyVehicles: rawData.standbyVehicles ?? [],
          isMock: false,
        });
      }
    } catch (backendErr) {
      console.warn(
        "[API /api/replacement-vehicle] 백엔드 연결 불가 또는 미구현. Fallback 데이터를 반환합니다.",
        backendErr
      );
    }

    // 백엔드 미구현 시 Fallback 반환
    return NextResponse.json({
      activeVehicles: FALLBACK_ACTIVE_VEHICLES,
      standbyVehicles: FALLBACK_STANDBY_VEHICLES,
      isMock: true,
      message: "백엔드 API 미구현으로 인해 임시 Mock 데이터를 반환했습니다.",
    });
  } catch (error) {
    console.error("[API /api/replacement-vehicle GET Error]:", error);
    return NextResponse.json(
      { error: "Internal server error", activeVehicles: [], standbyVehicles: [] },
      { status: 500 }
    );
  }
}

/**
 * 대차 실행 처리
 */
export async function POST(request: NextRequest) {
  try {
    const payload: ReplacementExecutePayload = await request.json().catch(() => ({}));

    // TODO: 백엔드 대차 실행 엔드포인트명 확정 시 교체 (예: /executeReplacementVehicle.do)
    const backendUrl = `${BACKEND_BASE_URL}/executeReplacementVehicle.do`;

    try {
      const response = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        const result = await response.json();
        return NextResponse.json({ success: true, result, isMock: false });
      }
    } catch (backendErr) {
      console.warn(
        "[API /api/replacement-vehicle POST] 백엔드 연결 불가. 대차 성공 시뮬레이션을 반환합니다.",
        backendErr
      );
    }

    // 백엔드 미구현 시 시뮬레이션 성공 응답
    return NextResponse.json({
      success: true,
      message: "대차가 성공적으로 실행되었습니다 (시뮬레이션).",
      payload,
      isMock: true,
    });
  } catch (error) {
    console.error("[API /api/replacement-vehicle POST Error]:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
