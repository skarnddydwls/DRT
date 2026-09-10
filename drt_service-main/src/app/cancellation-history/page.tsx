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

export default function CancellationHistoryPage() {
  const gridRef = useRef(null);

  const [filters, setFilters] = useState<CancellationFilters>(
    defaultCancellationFilters
  );
  const [allRows, setAllRows] = useState<CancellationRow[]>([]);
  const [loading, setLoading] = useState(false);

  const columnDefs = useMemo(() => cancellationColumnDefs, []);

  // 결항 정보 fetch 함수
  const fetchData = useCallback(async (searchFilters: CancellationFilters) => {
    setLoading(true);

    try {
      const response = await fetch("/api/cancellation/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filters: searchFilters,
        }),
      });

      if (!response.ok) {
        throw new Error(`조회 실패 (상태코드: ${response.status})`);
      }

      const data = (await response.json()) as {
        cancellations?: Array<Record<string, unknown>>;
      };

      const mappedRows: CancellationRow[] = (data.cancellations ?? []).map((item) => ({
        cancel_dtm: String(item.cancel_dtm ?? item.operation_date ?? ""),
        plan_dtm: String(item.plan_dtm ?? item.scheduled_time ?? ""),
        ship_nm: String(item.ship_nm ?? ""),
        start_port_nm: String(item.start_port_nm ?? ""),
        end_port_nm: String(item.end_port_nm ?? ""),
        cancel_reason: String(item.cancel_reason ?? item.reason ?? ""),
      }));

      setAllRows(mappedRows);
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