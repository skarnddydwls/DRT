"use client";

import type { StandbyVehicle } from "@/types/replacement-vehicle";

interface StandbyVehicleListProps {
  vehicles: StandbyVehicle[];
  selectedId: string | null;
  onSelect: (vehicle: StandbyVehicle) => void;
}

export default function StandbyVehicleList({
  vehicles,
  selectedId,
  onSelect,
}: StandbyVehicleListProps) {
  return (
    <section className="flex h-full min-h-0 flex-col rounded-xl border border-[#CCCCCC] bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#222222] text-[11px] font-bold text-white">
            2
          </span>
          <h2 className="text-base font-bold text-[#222222]">
            대차 가능 차량 선택 (투입예정)
          </h2>
        </div>
        <span className="text-xs text-gray-400">대기 중인 차량을 선택하세요</span>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5">
        {vehicles.map((v) => {
          const isSelected = selectedId === v.id;
          return (
            <div
              key={v.id}
              onClick={() => onSelect(v)}
              className={`flex cursor-pointer items-center justify-between rounded-[12px] border p-3.5 transition-all ${
                isSelected
                  ? "border-blue-600 bg-blue-50/60 ring-1 ring-blue-600"
                  : "border-[#CCCCCC] bg-white hover:border-gray-400"
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#222222]">{v.plate}</span>
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700">
                    {v.location}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className={`h-8 rounded-[8px] px-3 text-xs font-bold transition-colors ${
                  isSelected
                    ? "bg-blue-600 text-white"
                    : "border border-[#CCCCCC] text-[#222222] hover:bg-gray-100"
                }`}
              >
                {isSelected ? "선택됨" : "선택"}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-[11px] text-gray-400">
      </p>
    </section>
  );
}