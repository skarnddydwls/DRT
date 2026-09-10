"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import Grid from "@/components/Grid";
import { FilterForm } from "@/components/ui/FilterForm";
import { incidentColumnDefs } from "@/features/incident/columnDefs";
import { defaultIncidentFilters, incidentFields } from "@/features/incident/fieldconfig";
import type { IncidentFilters, IncidentRow } from "@/types/incident";

export default function IncidentHistoryPage() {
  const gridRef = useRef(null);

  const [filters, setFilters] = useState<IncidentFilters>(defaultIncidentFilters);
  const [allRows, setAllRows] = useState<IncidentRow[]>([]);
  const [loading, setLoading] = useState(false);

  const columnDefs = useMemo(() => incidentColumnDefs, []);

  const fetchData = useCallback(async (searchFilters: IncidentFilters) => {
    setLoading(true);

    try {
      const response = await fetch("/api/incident/history", {
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
        incidents?: Array<Record<string, unknown>>;
      };

      const mappedRows: IncidentRow[] = (data.incidents ?? []).map((item) => ({
        occurred_dtm: String(item.occurred_dtm ?? item.occurredDate ?? ""),
        vehicle_no: String(item.vehicle_no ?? item.vehicleNo ?? ""),
        incident_type: String(item.incident_type ?? item.incidentType ?? ""),
        latitude: Number(item.latitude ?? item.lat ?? 0),
        longitude: Number(item.longitude ?? item.lng ?? 0),
        description: String(item.description ?? item.details ?? ""),
      }));

      setAllRows(mappedRows);
    } catch (error) {
      console.error("Error fetching incident data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (newFilters: IncidentFilters) => {
    setFilters(newFilters);
    fetchData(newFilters);
  };


  return (
    <section>
      {/* 1. 박스 밖으로 뺀 페이지 제목 */}
      <div className="mb-6">
        <h1 className="text-[28px] font-bold tracking-tight">유고정보 이력</h1>
        {/* 필요 시 서브 텍스트 추가 가능 */}
        <p className="mt-1 text-sm text-gray-500">유고정보 이력을 조회합니다.</p>
      </div>

      {/* 2. 필터와 그리드만 라운드 네모 박스로 감싸기 */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <FilterForm<IncidentFilters>
          fields={incidentFields}
          defaultValues={defaultIncidentFilters}
          values={filters}
          onChange={setFilters}
          onSearch={handleSearch}
          className="mb-4"
        />

        {loading ? (
          <div
            className="flex items-center justify-center"
            style={{ height: 560 }}>
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
      </div>
    </section>
  );
}