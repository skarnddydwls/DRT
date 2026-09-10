"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Grid from "@/components/Grid";
import { FilterForm } from "@/components/ui/FilterForm";
import { getCallList } from "@/lib/api/call";
import { callColumnDefs } from "@/features/calls/columnDefs";
import { defaultFilters, callFields } from "@/features/calls/fieldconfig";
import type { CallFilters, CallRow } from "@/types/call";

export default function CallsPage() {
  const gridRef = useRef(null);

  const [filters, setFilters] = useState<CallFilters>(defaultFilters);
  const [allRows, setAllRows] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(false);

  // API 호출로 데이터 가져오기
  useEffect(() => {
    const fetchCallList = async () => {
      setLoading(true);
      try {
        const response = await getCallList(filters);
        setAllRows(response.calls);
      } catch (error) {
        console.error("Failed to fetch call list:", error);
        // 에러 처리 (토스트 메시지 등)
      } finally {
        setLoading(false);
      }
    };

    fetchCallList();
  }, [filters]);

  // 필터링된 데이터 (필요시 클라이언트 사이드 추가 필터링)
  const rowData = useMemo(() => {
    return allRows.filter((r) => {
      const matchCallDatetime = filters.callDatetime
        ? String(r["call_dtm"] || "").includes(filters.callDatetime)
        : true;
      const matchRouteNm = filters.routeNm
        ? String(r["route_nm"] || "").includes(filters.routeNm)
        : true;
      const matchStartPointNm = filters.startPointNm
        ? String(r["start_point_nm"] || "").includes(filters.startPointNm)
        : true;
      const matchEndPointNm = filters.endPointNm
        ? String(r["end_point_nm"] || "").includes(filters.endPointNm)
        : true;
      return (
        matchCallDatetime &&
        matchRouteNm &&
        matchStartPointNm &&
        matchEndPointNm
      );
    });
  }, [allRows, filters]);

  const columnDefs = useMemo(() => callColumnDefs, []);

  return (
    <section className="rounded-xl border bg-white p-4">
      {/* 페이지 제목 */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold">호출기록 조회</h1>
      </div>

      <FilterForm<CallFilters>
        fields={callFields}
        defaultValues={defaultFilters}
        values={filters}
        onChange={setFilters}
        onSearch={(v) => setFilters(v)}
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
          rowData={rowData}
          columnDefs={columnDefs}
          gridRef={gridRef}
          gridOptions={{}}
          height={"calc(100vh - 400px)"}
          enableNumberColoring={true}
        />
      )}
    </section>
  );
}
