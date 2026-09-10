"use client";

import { useState } from "react";
import ActiveVehicleTable from "@/features/replacement-vehicle/components/ActiveVehicleTable";
import StandbyVehicleList from "@/features/replacement-vehicle/components/StandVehicleList";
import ReplacementActionForm from "@/features/replacement-vehicle/components/ReplacementActionForm";
import type {
  ActiveVehicle,
  StandbyVehicle,
  ReplacementExecutePayload,
} from "@/types/replacement-vehicle";

const MOCK_ACTIVE_VEHICLES: ActiveVehicle[] = [
  { id: "V-001", plate: "전남70바5011", driver: "김철수", route: "금오도 1코스 (여천항-직포)", passengers: "3명", status: "운행중" },
  { id: "V-002", plate: "전남70자5014", driver: "박영진", route: "금오도 2코스 (남면소재지)", passengers: "1명", status: "운행중" },
  { id: "V-003", plate: "전남70바5022", driver: "이민호", route: "여천항 연계 직통 노선", passengers: "0명", status: "운행중" },
];

const MOCK_STANDBY_VEHICLES: StandbyVehicle[] = [
  { id: "V-008", plate: "전남70바5088", driver: "정대리 (대기조)", location: "남면 차고지" },
  { id: "V-009", plate: "전남70자5099", driver: "송기사 (순환조)", location: "여천항 대기소" },
];

export default function ReplacementControlPage() {
  const [activeVehicles] = useState<ActiveVehicle[]>(MOCK_ACTIVE_VEHICLES);
  const [standbyVehicles] = useState<StandbyVehicle[]>(MOCK_STANDBY_VEHICLES);

  const [selectedOrigin, setSelectedOrigin] = useState<ActiveVehicle | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<StandbyVehicle | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleExecute = (payload: ReplacementExecutePayload) => {
    if (
      !confirm(
        `[대차 실행 확인]\n\n• 원차량: ${selectedOrigin?.plate}\n• 대체 투입: ${selectedTarget?.plate}\n\n즉시 배차를 인계하시겠습니까?`
      )
    ) {
      return;
    }

    setSubmitting(true);
    try {
      console.log("대차 API 호출 Payload:", payload);
      alert("대차가 성공적으로 실행되었습니다.");
      handleReset();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedOrigin(null);
    setSelectedTarget(null);
  };

  return (
    <section>
      {/* 상단 페이지 헤더: 좌측 제목/설명 + 우측 끝 가로 배지 */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">대차 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            운행 중인 차량을 대체 투입 차량으로 대차 처리합니다.
          </p>
        </div>

        {/* 우측 끝 가로 배치 */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-800">
              운행 중 차량 <strong>{activeVehicles.length}</strong>대
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 border border-blue-200">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-xs font-semibold text-blue-800">
              대차 가능 차량 <strong>{standbyVehicles.length}</strong>대
            </span>
          </div>
        </div>
      </div>

      {/* 다른 페이지들과 동일한 규격의 메인 네모박스 */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
          style={{ height: "calc(100vh - 310px)" }}
        >
          {/* 좌측: 사유 및 입력 승인 (5열) */}
          <div className="lg:col-span-5 flex flex-col h-full min-h-0">
            <ReplacementActionForm
              originVehicle={selectedOrigin}
              targetVehicle={selectedTarget}
              onSubmit={handleExecute}
              onReset={handleReset}
              submitting={submitting}
            />
          </div>

          {/* 우측: 상단 운행 중 차량 + 하단 대차 가능 차량 (7열) */}
          <div className="lg:col-span-7 flex flex-col gap-4 h-full min-h-0">
            <div className="flex-[1.1] min-h-0">
              <ActiveVehicleTable
                vehicles={activeVehicles}
                selectedId={selectedOrigin?.id || null}
                onSelect={setSelectedOrigin}
              />
            </div>
            <div className="flex-1 min-h-0">
              <StandbyVehicleList
                vehicles={standbyVehicles}
                selectedId={selectedTarget?.id || null}
                onSelect={setSelectedTarget}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}