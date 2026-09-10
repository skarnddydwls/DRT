"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import Grid from "@/components/Grid";
import { FilterForm } from "@/components/ui/FilterForm";
import { replacementVehicleColumnDefs } from "@/features/replacement-vehicle-history/columnDefs";
import {
  defaultReplacementFields,
  replacementVehicleFields,
} from "@/features/replacement-vehicle-history/fieldconfig";
import type {
  ReplacementVehicleFilters,
  ReplacementVehicleRow,
} from "@/types/replacement-vehicle-history";

export default function ReplacementHistoryPage() {
  const gridRef = useRef(null);

  const [filters, setFilters] = useState<ReplacementVehicleFilters>(
    defaultReplacementFields
  );
  const [allRows, setAllRows] = useState<ReplacementVehicleRow[]>([]);
  const [loading, setLoading] = useState(false);

  const columnDefs = useMemo(() => replacementVehicleColumnDefs, []);

  const fetchData = useCallback(async (searchFilters: ReplacementVehicleFilters) => {
      setLoading(true);
  
      try {
        const response = await fetch("/api/replacement-vehicle/history", {
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
          replacements?: Array<Record<string, unknown>>;
        };
        const mappedRows: ReplacementVehicleRow[] = (data.replacements ?? []).map((item) => ({
          replace_dtm: String(item.replacement_date ?? ""),
          origin_vehicle_id: String(item.origin_vehicle_id ?? ""),
          replace_vehicle_id: String(item.replace_vehicle_id ?? ""),
          status: String(item.replacement_status ?? ""),
          reason: String(item.replacement_reason ?? ""),  
        }));
  
        setAllRows(mappedRows);
      }
      catch (error) {
        console.error("Error fetching replacement vehicle data:", error);
      }
      finally {
        setLoading(false);
      }
    }, []);


    const handleSearch = (newFilters: ReplacementVehicleFilters) => {
      setFilters(newFilters);
      fetchData(newFilters);
    };


  return (
    <section>
      {/* 페이지 제목 */}
      <div className="mb-6">
        <h1 className="text-[28px] font-bold tracking-tight">대차정보 이력</h1>
        <p className="mt-1 text-sm text-gray-500">대차정보 이력을 조회합니다.</p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <FilterForm<ReplacementVehicleFilters>
          fields={replacementVehicleFields}
          defaultValues={defaultReplacementFields}
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