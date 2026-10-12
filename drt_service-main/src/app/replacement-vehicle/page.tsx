"use client";

import { useEffect, useState } from "react";
import ActiveVehicleTable from "@/features/replacement-vehicle/components/ActiveVehicleTable";
import StandbyVehicleList from "@/features/replacement-vehicle/components/StandVehicleList";
import ReplacementActionForm from "@/features/replacement-vehicle/components/ReplacementActionForm";
import type {
  ActiveVehicle,
  StandbyVehicle,
  ReplacementExecutePayload,
} from "@/types/replacement-vehicle";
import {
  getReplacementVehicleData,
  executeReplacement,
} from "@/lib/api/replacementVehicle";

export default function ReplacementControlPage() {
  const [activeVehicles, setActiveVehicles] = useState<ActiveVehicle[]>([]);
  const [standbyVehicles, setStandbyVehicles] = useState<StandbyVehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedOrigin, setSelectedOrigin] = useState<ActiveVehicle | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<StandbyVehicle | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 마운트 시 차량 데이터 조회
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      try {
        const data = await getReplacementVehicleData();
        if (isMounted) {
          setActiveVehicles(data.activeVehicles ?? []);
          setStandbyVehicles(data.standbyVehicles ?? []);
        }
      } catch (err) {
        console.error("차량 데이터 조회 실패:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleExecute = async (payload: ReplacementExecutePayload) => {
    if (
      !confirm(
        `[대차 실행 확인]\n\n• 원차량: ${selectedOrigin?.plate}\n• 대체 투입: ${selectedTarget?.plate}\n\n즉시 배차를 인계하시겠습니까?`
      )
    ) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await executeReplacement(payload);
      if (res.success) {
        alert("대차가 성공적으로 실행되었습니다.");
        handleReset();
        // 대차 후 최신 차량 목록 갱신
        const refreshed = await getReplacementVehicleData();
        setActiveVehicles(refreshed.activeVehicles ?? []);
        setStandbyVehicles(refreshed.standbyVehicles ?? []);
      } else {
        alert(res.message || "대차 실행에 실패했습니다.");
      }
    } catch (e) {
      console.error("대차 실행 에러:", e);
      alert("대차 처리 중 오류가 발생했습니다.");
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
              운행 중 차량 <strong>{loading ? "-" : activeVehicles.length}</strong>대
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 border border-blue-200">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-xs font-semibold text-blue-800">
              대차 가능 차량 <strong>{loading ? "-" : standbyVehicles.length}</strong>대
            </span>
          </div>
        </div>
      </div>

      {/* 다른 페이지들과 동일한 규격의 메인 네모박스 */}
      <div className="rounded-xl border bg-white p-6 shadow-sm min-h-0 h-auto lg:h-[calc(100vh-310px)] lg:min-h-[680px]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch h-full">
          {/* 좌측: 사유 및 입력 승인 (5열) */}
          <div className="lg:col-span-5 flex flex-col min-h-[480px] lg:min-h-0 lg:h-full">
            <ReplacementActionForm
              originVehicle={selectedOrigin}
              targetVehicle={selectedTarget}
              onSubmit={handleExecute}
              onReset={handleReset}
              submitting={submitting}
            />
          </div>

          {/* 우측: 상단 운행 중 차량 + 하단 대차 가능 차량 (7열) */}
          <div className="lg:col-span-7 flex flex-col gap-4 min-h-[600px] lg:min-h-0 lg:h-full">
            <div className="flex-[1.1] min-h-[280px] lg:min-h-0">
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