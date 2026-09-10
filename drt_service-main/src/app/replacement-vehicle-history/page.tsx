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
    <section className="rounded-xl border bg-white p-4">
      {/* 페이지 제목 */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold">대차정보 이력</h1>
      </div>

      <FilterForm<ReplacementVehicleFilters>
        fields={replacementVehicleFields}
        defaultValues={defaultReplacementFields}
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