"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FilterForm } from "@/components/ui/FilterForm";
import Grid from "@/components/Grid";
import VWorldMap from "@/components/VWorldMap";
import { getRouteList } from "@/lib/api/route";
import { routeColumnDefs } from "@/features/route/columnDefs";
import { defaultFilters, routeFields } from "@/features/route/fieldconfig";
import type { RouteFilters, RouteRow } from "@/types/route";

export default function RoutePage() {
  const gridRef = useRef(null);

  const [filters, setFilters] = useState<RouteFilters>(defaultFilters);
  const [allRows, setAllRows] = useState<RouteRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRouteList = async () => {
      setLoading(true);
      try {
        const response = await getRouteList(filters);
        setAllRows(response.routes);
      } catch (error) {
        console.error("Failed to fetch route list:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRouteList();
  }, [filters]);

  const rowData = useMemo(() => {
    return allRows.filter((r) => {
      const matchRoute = filters.routeName
        ? String(r["route_nm"])?.includes(filters.routeName)
        : true;
      return matchRoute;
    });
  }, [allRows, filters]);

  const columnDefs = useMemo(() => routeColumnDefs, []);

  return (
    <section className="rounded-xl border bg-white p-4">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">노선관리</h1>
      </div>

      <FilterForm<RouteFilters>
        fields={routeFields}
        defaultValues={defaultFilters}
        values={filters}
        onChange={setFilters}
        onSearch={(v) => setFilters(v)}
        className="mb-4"
      />

      {/* 그리드와 지도를 2:1 비율로 배치 */}
      <div className="flex gap-4" style={{ height: "calc(100vh - 350px)" }}>
        {/* 그리드 영역 (2/3) */}
        <div className="flex-[2] flex flex-col">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p>데이터를 불러오는 중...</p>
            </div>
          ) : (
            <Grid
              rowData={rowData}
              columnDefs={columnDefs}
              gridRef={gridRef}
              gridOptions={{}}
              height={"100%"}
              enableNumberColoring={true}
            />
          )}
        </div>

        {/* 지도 영역 (1/3) */}
        {/* <div className="flex-1">
          <VWorldMap mapId="route-map" className="h-full" />
        </div> */}
      </div>
    </section>
  );
}
