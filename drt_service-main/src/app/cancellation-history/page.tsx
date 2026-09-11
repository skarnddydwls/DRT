"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import Grid from "@/components/Grid";
import { FilterForm } from "@/components/ui/FilterForm";
import { cancellationColumnDefs } from "@/features/cancellation/columnDefs";
import {
  defaultCancellationFilters,
  cancellationFields,
} from "@/features/cancellation/fieldconfig";
import type {
  CancellationFilters,
  CancellationRow,
} from "@/types/cancellation";
import { getCancellationHistoryList } from "@/lib/api/cancellation";

const DUMMY_CANCELLATIONS: CancellationRow[] = [
  {
    cancel_dtm: "2026-09-11 08:30:00",
    plan_dtm: "2026-09-11 09:00:00",
    ship_nm: "금오페리 1호",
    start_port_nm: "여천항",
    end_port_nm: "신기항",
    cancel_reason: "풍랑주의보 및 기상 악화",
  },
  {
    cancel_dtm: "2026-09-11 10:15:00",
    plan_dtm: "2026-09-11 11:00:00",
    ship_nm: "한려카페리호",
    start_port_nm: "신기항",
    end_port_nm: "여천항",
    cancel_reason: "기관 점검 및 긴급 정비",
  },
  {
    cancel_dtm: "2026-09-10 14:00:00",
    plan_dtm: "2026-09-10 14:30:00",
    ship_nm: "금오고속훼리",
    start_port_nm: "여수항",
    end_port_nm: "직포항",
    cancel_reason: "해상 짙은 안개 (저시정 경보)",
  },
  {
    cancel_dtm: "2026-09-09 16:20:00",
    plan_dtm: "2026-09-09 17:00:00",
    ship_nm: "금오페리 2호",
    start_port_nm: "여천항",
    end_port_nm: "신기항",
    cancel_reason: "너울성 파도 및 강풍",
  },
  {
    cancel_dtm: "2026-09-08 07:45:00",
    plan_dtm: "2026-09-08 08:30:00",
    ship_nm: "남면아일랜드호",
    start_port_nm: "직포항",
    end_port_nm: "여천항",
    cancel_reason: "선박 정기 안전검사",
  },
];

export default function CancellationHistoryPage() {
  const gridRef = useRef(null);

  const [filters, setFilters] = useState<CancellationFilters>(
    defaultCancellationFilters
  );
  const [allRows, setAllRows] = useState<CancellationRow[]>(DUMMY_CANCELLATIONS);
  const [loading, setLoading] = useState(false);

  const columnDefs = useMemo(() => cancellationColumnDefs, []);

  // 결항 정보 fetch 함수
  const fetchData = useCallback(async (searchFilters: CancellationFilters) => {
    setLoading(true);

    try {
      const rows = await getCancellationHistoryList(searchFilters);
      setAllRows(rows);
    } catch (error) {
      console.error("Error fetching ferry cancellation data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (newFilters: CancellationFilters) => {
    setFilters(newFilters);
    fetchData(newFilters);
  };

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-[28px] font-bold tracking-tight">결항정보 이력</h1>
        <p className="mt-1 text-sm text-gray-500">결항정보 이력을 조회합니다.</p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <FilterForm<CancellationFilters>
          fields={cancellationFields}
          defaultValues={defaultCancellationFilters}
          values={filters}
          onChange={setFilters}
          onSearch={handleSearch}
          className="mb-4"
        />

        <div className="relative" style={{ height: "calc(100vh - 400px)" }}>
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-white/75 backdrop-blur-[1px]">
              <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              <p className="text-sm font-semibold text-gray-700">데이터를 불러오는 중...</p>
            </div>
          )}
          <Grid
            rowData={allRows}
            columnDefs={columnDefs}
            gridRef={gridRef}
            gridOptions={{
              onGridReady: (params: any) => {
                params.api?.sizeColumnsToFit();
              },
              onGridSizeChanged: (params: any) => {
                params.api?.sizeColumnsToFit();
              },
            }}
            height="100%"
            enableNumberColoring={true}
          />
        </div>
      </div>
    </section>
  );
}