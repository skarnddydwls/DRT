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
    <section className="flex h-full flex-col rounded-xl border border-[#CCCCCC] bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-[#222222]">
            대차 사유 입력 및 승인
          </h2>
        </div>
        <span className="text-xs text-gray-400">
          원차량과 대차차량 확인 후 실행
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col justify-between gap-5">
        <div className="flex flex-1 flex-col gap-5">
          {/* 매칭 요약 배너 */}
          <div className="flex h-[80px] items-center justify-between rounded-[12px] border border-[#CCCCCC] bg-[#FAFAFA] px-4">
            <div className="text-center flex-1 min-w-0">
              <span className="block text-[11px] font-semibold text-gray-400">
                원차량 (교체대상)
              </span>
              <span
                className={`block truncate text-sm font-bold ${
                  originVehicle ? "text-rose-600" : "text-gray-400"
                }`}
                title={originVehicle ? `${originVehicle.plate} (${originVehicle.driver})` : undefined}
              >
                {originVehicle
                  ? `${originVehicle.plate} (${originVehicle.driver})`
                  : "미선택"}
              </span>
            </div>
            <div className="px-2 text-base font-black text-gray-300">➔</div>
            <div className="text-center flex-1 min-w-0">
              <span className="block text-[11px] font-semibold text-gray-400">
                대차차량 (투입예정)
              </span>
              <span
                className={`block truncate text-sm font-bold ${
                  targetVehicle ? "text-blue-600" : "text-gray-400"
                }`}
                title={targetVehicle ? `${targetVehicle.plate} (${targetVehicle.driver})` : undefined}
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
              className="h-[48px] w-full rounded-[12px] border border-[#CCCCCC] bg-white px-4 text-sm text-[#222222] outline-none focus:border-black cursor-pointer shadow-sm"
            >
              <option value="">사유를 선택하세요</option>
              <option value="BREAKDOWN">차량 고장 (엔진/조향/제동계통)</option>
              <option value="ACCIDENT">교통사고 발생</option>
              <option value="BATTERY_FLAT">배터리 저전압 / 방전</option>
              <option value="DRIVER_EMERGENCY">기사 신병 / 응급 상황</option>
              <option value="ETC">기타 사유</option>
            </select>
          </div>

          {/* 상세 메모 (남은 높이 채움) */}
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-xs font-bold text-[#222222]">
              상세 경위 및 인계 메모
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="상세 경위나 인계 특이사항을 입력하세요 (예: 직포항 부근 타이어 펑크로 인하여 즉시 대차 요청함)"
              className="w-full flex-1 min-h-[160px] resize-none rounded-[12px] border border-[#CCCCCC] p-4 text-sm text-[#222222] outline-none placeholder:text-gray-400 focus:border-black leading-relaxed shadow-sm"
            />
          </div>
        </div>

        {/* 하단 버튼 바 */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={handleFormReset}
            className="h-[48px] min-w-[100px] rounded-[12px] border border-[#CCCCCC] bg-white px-5 text-sm font-bold text-[#222222] hover:bg-gray-50 transition-colors"
          >
            선택 초기화
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="h-[48px] flex-1 rounded-[12px] bg-[#222222] px-6 text-sm font-bold text-white hover:bg-black transition-colors shadow-sm disabled:bg-gray-400"
          >
            {submitting ? "처리 중..." : "대차 명령 실행"}
          </button>
        </div>
      </form>
    </section>
  );
}