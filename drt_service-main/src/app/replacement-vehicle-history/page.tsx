"use client";

import { useMemo, useRef, useState, useCallback, useEffect } from "react";
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
import { getReplacementVehicleHistoryList } from "@/lib/api/replacementVehicle";

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
        const rows = await getReplacementVehicleHistoryList(searchFilters);
        setAllRows(rows);
      }
      catch (error) {
        console.error("Error fetching replacement vehicle data:", error);
      }
      finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => {
      fetchData(defaultReplacementFields);
    }, [fetchData]);

    const handleSearch = (newFilters: ReplacementVehicleFilters) => {
      setFilters(newFilters);
    };

    const rowData = useMemo(() => {
      return allRows.filter((row) => {
        const matchDate = filters.replacementDate
          ? String(row.replace_dtm ?? "").startsWith(filters.replacementDate)
          : true;
        return matchDate;
      });
    }, [allRows, filters]);

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
            rowData={rowData}
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