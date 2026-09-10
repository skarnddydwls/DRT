"use client";

import { useState } from "react";
import type {
  ActiveVehicle,
  StandbyVehicle,
  ReplacementExecutePayload,
} from "@/types/replacement-vehicle";

interface ReplacementActionFormProps {
  originVehicle: ActiveVehicle | null;
  targetVehicle: StandbyVehicle | null;
  onSubmit: (payload: ReplacementExecutePayload) => void;
  onReset: () => void;
  submitting?: boolean;
}

export default function ReplacementActionForm({
  originVehicle,
  targetVehicle,
  onSubmit,
  onReset,
  submitting = false,
}: ReplacementActionFormProps) {
  const [reason, setReason] = useState("");
  const [memo, setMemo] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!originVehicle) {
      alert("1단계: 운행 중인 원차량을 먼저 선택해주세요.");
      return;
    }
    if (!targetVehicle) {
      alert("2단계: 대체 투입할 대차차량을 선택해주세요.");
      return;
    }
    if (!reason) {
      alert("대차 사유를 선택해주세요.");
      return;
    }

    onSubmit({
      originVehicleId: originVehicle.id,
      replaceVehicleId: targetVehicle.id,
      reason,
      memo,
    });
  };

  const handleFormReset = () => {
    setReason("");
    setMemo("");
    onReset();
  };

  return (
    <section className="rounded-xl border border-[#CCCCCC] bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-[#222222]">
            대차 사유 입력 및 승인
          </h2>
        </div>
        <span className="text-xs text-gray-400">
          원차량과 대차차량을 확인하고 사유를 작성하세요
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* 상단 2분할: 좌측은 매칭 요약 배너, 우측은 사유 선택 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* 매칭 요약 배너 */}
          <div className="flex h-[82px] items-center justify-between rounded-[12px] border border-[#CCCCCC] bg-[#FAFAFA] px-6">
            <div className="text-center flex-1">
              <span className="block text-[11px] font-semibold text-gray-400">
                원차량 (교체대상)
              </span>
              <span
                className={`text-sm font-bold ${
                  originVehicle ? "text-rose-600" : "text-gray-400"
                }`}
              >
                {originVehicle
                  ? `${originVehicle.plate} (${originVehicle.driver})`
                  : "미선택"}
              </span>
            </div>
            <div className="px-3 text-lg font-black text-gray-300">➔</div>
            <div className="text-center flex-1">
              <span className="block text-[11px] font-semibold text-gray-400">
                대차차량 (투입예정)
              </span>
              <span
                className={`text-sm font-bold ${
                  targetVehicle ? "text-blue-600" : "text-gray-400"
                }`}
              >
                {targetVehicle
                  ? `${targetVehicle.plate} (${targetVehicle.driver})`
                  : "미선택"}
              </span>
            </div>
          </div>

          {/* 대차 사유 선택 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#222222]">
              대차 사유 <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-[50px] w-full rounded-[12px] border border-[#CCCCCC] bg-white px-4 text-sm text-[#222222] outline-none focus:border-black cursor-pointer shadow-sm"
            >
              <option value="">사유를 선택하세요</option>
              <option value="BREAKDOWN">차량 고장 (엔진/조향/제동계통)</option>
              <option value="ACCIDENT">교통사고 발생</option>
              <option value="BATTERY_FLAT">배터리 저전압 / 방전</option>
              <option value="DRIVER_EMERGENCY">기사 신병 / 응급 상황</option>
              <option value="ETC">기타 사유</option>
            </select>
          </div>
        </div>

        {/* 상세 메모 (가로 꽉 채움) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#222222]">
            상세 경위 및 인계 메모
          </label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
            placeholder="상세 경위나 인계 특이사항을 입력하세요 (예: 직포항 부근 타이어 펑크로 인하여 즉시 대차 요청함)"
            className="w-full resize-none rounded-[12px] border border-[#CCCCCC] p-4 text-sm text-[#222222] outline-none placeholder:text-gray-400 focus:border-black leading-relaxed shadow-sm"
          />
        </div>

        {/* 하단 버튼 바 */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleFormReset}
            className="h-[50px] min-w-[110px] rounded-[12px] border border-[#CCCCCC] bg-white px-5 text-sm font-bold text-[#222222] hover:bg-gray-50 transition-colors"
          >
            선택 초기화
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="h-[50px] min-w-[160px] rounded-[12px] bg-[#222222] px-6 text-sm font-bold text-white hover:bg-black transition-colors shadow-sm disabled:bg-gray-400"
          >
            {submitting ? "처리 중..." : "대차 명령 실행"}
          </button>
        </div>
      </form>
    </section>
  );
}