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
    <section className="rounded-xl border bg-white p-4">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">결항정보 이력</h1>
      </div>

      <FilterForm<CancellationFilters>
        fields={cancellationFields}
        defaultValues={defaultCancellationFilters}
        values={filters}
        onChange={setFilters}
        onSearch={handleSearch}
        className="mb-4"
      />

      {loading ? (
        <div
          className="flex items-center justify-center"
          style={{ height: 560 }}
        >
          <p>데이터를 불러오는 중...</p>
        </div>
      ) : (
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
          height={"calc(100vh - 400px)"}
          enableNumberColoring={true}
        />
      )}
    </section>
  );
}