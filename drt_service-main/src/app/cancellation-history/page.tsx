"use client";

import { useMemo, useRef, useState, useCallback, useEffect } from "react";
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

export default function CancellationHistoryPage() {
  const gridRef = useRef(null);

  const [filters, setFilters] = useState<CancellationFilters>(
    defaultCancellationFilters
  );
  const [allRows, setAllRows] = useState<CancellationRow[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const requestRef = useRef(0);
  const [loading, setLoading] = useState(false);

  const columnDefs = useMemo(() => cancellationColumnDefs, []);

  // 결항 정보 fetch 함수
  const fetchData = useCallback(async (searchFilters: CancellationFilters) => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setErrorMessage("");

    try {
      const rows = await getCancellationHistoryList(searchFilters);
      if (requestId === requestRef.current) setAllRows(rows);
    } catch (error) {
      if (requestId === requestRef.current) {
        setAllRows([]);
        setErrorMessage(error instanceof Error ? error.message : "결항정보 이력을 조회하지 못했습니다.");
      }
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(defaultCancellationFilters);
  }, [fetchData]);

  const handleSearch = (newFilters: CancellationFilters) => {
    setFilters(newFilters);
    void fetchData(newFilters);
  };

  const rowData = useMemo(() => {
    return allRows.filter((row) => {
      const matchDate = filters.cancellationDate
        ? String(row.cancel_dtm ?? "").startsWith(filters.cancellationDate)
        : true;
      return matchDate;
    });
  }, [allRows, filters]);

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-[28px] font-bold tracking-tight">결항정보 이력</h1>
        <p className="mt-1 text-sm text-gray-500">10분마다 MTIS Python 조회에서 확인한 여수 비운·통제 이력입니다. 최초 확인시각은 실제 결항 발생시각과 다를 수 있습니다. 최신 1,000건까지 조회합니다.</p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <FilterForm<CancellationFilters>
          fields={cancellationFields}
          defaultValues={defaultCancellationFilters}
          values={filters}
          onSearch={handleSearch}
          className="mb-4"
        />

        {errorMessage && <p role="alert" className="mb-4 text-sm text-red-700">{errorMessage}</p>}
        {!loading && !errorMessage && rowData.length === 0 && <p className="mb-4 text-sm text-gray-500">조회된 결항정보 이력이 없습니다.</p>}
        <div className="relative" style={{ height: "calc(100vh - 400px)" }}>
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-white/75 backdrop-blur-[1px]">
              <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              <p className="text-sm font-semibold text-gray-700">데이터를 불러오는 중...</p>
            </div>
          )}
          <Grid
            rowData={rowData}
            columnDefs={columnDefs}
            gridRef={gridRef}
            gridOptions={{
              onGridReady: (params) => {
                params.api?.sizeColumnsToFit();
              },
              onGridSizeChanged: (params) => {
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
