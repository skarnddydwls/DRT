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

  const fetchRouteList = async (searchFilters: RouteFilters = filters) => {
    setLoading(true);
    try {
      const response = await getRouteList(searchFilters);
      setAllRows(response.routes);
    } catch (error) {
      console.error("Failed to fetch route list:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRouteList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (searchFilters: RouteFilters = filters) => {
    setFilters(searchFilters);
  };

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
    <section>
      <div className="mb-6">
        <h1 className="text-[28px] font-bold tracking-tight">노선관리</h1>
        <p className="mt-1 text-sm text-gray-500">노선 정보를 조회하고 관리합니다.</p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <FilterForm<RouteFilters>
          fields={routeFields}
          defaultValues={defaultFilters}
          values={filters}
          onSearch={handleSearch}
          className="mb-4"
        />

        {/* 그리드와 지도를 2:1 비율로 배치 */}
        <div className="flex gap-4" style={{ height: "calc(100vh - 400px)" }}>
          {/* 그리드 영역 (2/3) */}
          <div className="relative flex-[2] flex flex-col">
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
              gridOptions={{}}
              height={"100%"}
              enableNumberColoring={true}
            />
          </div>

          {/* 지도 영역 (1/3) */}
          {/* <div className="flex-1">
            <VWorldMap mapId="route-map" className="h-full" />
          </div> */}
        </div>
      </div>
    </section>
  );
}
