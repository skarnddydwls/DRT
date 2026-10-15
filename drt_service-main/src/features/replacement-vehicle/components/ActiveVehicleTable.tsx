"use client";

import type { ActiveVehicle } from "@/types/replacement-vehicle";

interface ActiveVehicleTableProps {
  vehicles: ActiveVehicle[];
  selectedId: string | null;
  onSelect: (vehicle: ActiveVehicle) => void;
}

export default function ActiveVehicleTable({
  vehicles,
  selectedId,
  onSelect,
}: ActiveVehicleTableProps) {
  return (
    <section className="flex h-full min-h-0 flex-col rounded-xl border border-[#CCCCCC] bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-[#222222]">
            원차량 선택 (운행 중 · 정상)
          </h2>
        </div>
        <span className="text-xs text-gray-400">교체 대상 차량을 선택하세요</span>
      </div>

      {/* 내부 스크롤 영역 */}
      <div className="flex-1 overflow-auto rounded-[12px] border border-[#CCCCCC]">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-[#CCCCCC] bg-[#FAFAFA] text-xs font-semibold text-[#222222]">
            <tr>
              <th className="w-12 p-3 text-center">선택</th>
              <th className="p-3">차량번호</th>
              <th className="p-3 text-center">탑승</th>
              <th className="p-3 text-center">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {vehicles.map((v) => {
              const isSelected = selectedId === v.id;
              return (
                <tr
                  key={v.id}
                  onClick={() => onSelect(v)}
                  className={`cursor-pointer transition-colors ${isSelected
                      ? "bg-rose-50/70 font-semibold"
                      : "hover:bg-gray-50"
                    }`}
                >
                  <td className="p-3 text-center">
                    <input
                      type="radio"
                      name="origin_vehicle"
                      checked={isSelected}
                      onChange={() => onSelect(v)}
                      className="accent-[#222222]"
                    />
                  </td>
                  <td className="p-3 font-bold text-[#222222]">{v.plate}</td>
                  <td className="p-3 text-center font-medium">{v.passengers}</td>
                  <td className="p-3 text-center">
                    <span className="inline-block rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                      {v.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-[11px] text-gray-400">
      </p>
    </section>
  );
}
