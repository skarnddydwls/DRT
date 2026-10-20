"use client";

import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import Grid from "@/components/Grid";
import KakaoMap from "@/components/KakaoMap";
import { FilterForm } from "@/components/ui/FilterForm";
import { incidentColumnDefs } from "@/features/incident/columnDefs";
import { defaultIncidentFilters, incidentFields } from "@/features/incident/fieldconfig";
import type { IncidentFilters, IncidentRow } from "@/types/incident";
import { getIncidentHistoryList } from "@/lib/api/incident";
import type { RowClickedEvent } from "ag-grid-community";
import type { Map } from "@/lib/maps/kakaoMap";
import { Feature } from "@/lib/maps/kakaoMap";
import { Point } from "@/lib/maps/kakaoMap";
import { VectorLayer } from "@/lib/maps/kakaoMap";
import { VectorSource } from "@/lib/maps/kakaoMap";
import { CircleStyle, Fill, Stroke, Style } from "@/lib/maps/kakaoMap";
import { fromLonLat } from "@/lib/maps/kakaoMap";

const MAP_INITIAL_CENTER: [number, number] = [127.748, 34.525];

export default function IncidentHistoryPage() {
  const gridRef = useRef(null);
  const mapRef = useRef<Map | null>(null);
  const markerSourceRef = useRef<VectorSource | null>(null);
  const requestRef = useRef(0);

  const [filters, setFilters] = useState<IncidentFilters>(defaultIncidentFilters);
  const [allRows, setAllRows] = useState<IncidentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedIncident, setSelectedIncident] = useState<IncidentRow | null>(null);

  const columnDefs = useMemo(() => incidentColumnDefs, []);

  // api 데이터 호출
  const fetchData = useCallback(async (searchFilters: IncidentFilters) => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setErrorMessage("");
    setSelectedIncident(null);
    markerSourceRef.current?.clear();

    try {
      const rows = await getIncidentHistoryList(searchFilters);
      if (requestId === requestRef.current) setAllRows(rows);
    } catch (error) {
      if (requestId === requestRef.current) {
        setAllRows([]);
        setErrorMessage(error instanceof Error ? error.message : "유고정보 이력을 조회하지 못했습니다.");
      }
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData(defaultIncidentFilters);
    return () => { ++requestRef.current; };
  }, [fetchData]);

  const handleSearch = (newFilters: IncidentFilters) => {
    setFilters(newFilters);
    void fetchData(newFilters);
  };

  const rowData = useMemo(() => {
    return allRows.filter((row) => {
      const matchDate = filters.occurredDate
        ? String(row.occurred_dtm ?? "").startsWith(filters.occurredDate)
        : true;
      const matchVehicle = filters.vehicleNo
        ? String(row.vehicle_no ?? "")
            .toLowerCase()
            .includes(filters.vehicleNo.trim().toLowerCase())
        : true;
      const matchType = filters.incidentType
        ? row.incident_type.toLowerCase().includes(filters.incidentType.trim().toLowerCase()) : true;
      return matchDate && matchVehicle && matchType;
    });
  }, [allRows, filters]);

  // 그리드에서 행 클릭 시 지도에 마커 띄움
  const handleRowClicked = (event: RowClickedEvent<IncidentRow>) => {
    const row = event.data;
    if (!row) return;
    setSelectedIncident(row);

    const lon = Number(row.longitude);
    const lat = Number(row.latitude);
    markerSourceRef.current?.clear();
    if (!Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lon) > 180 || Math.abs(lat) > 90) return;

    if (mapRef.current) {
      if (!markerSourceRef.current) {
        const source = new VectorSource();
        const layer = new VectorLayer({ source });
        mapRef.current.addLayer(layer);
        markerSourceRef.current = source;
      }

      markerSourceRef.current.clear();
      const marker = new Feature({
        geometry: new Point(fromLonLat([lon, lat])),
      });
      marker.setStyle(
        new Style({
          image: new CircleStyle({
            radius: 8,
            fill: new Fill({ color: "#dc2626" }),
            stroke: new Stroke({ color: "#ffffff", width: 2.5 }),
          }),
        })
      );
      markerSourceRef.current.addFeature(marker);

      mapRef.current.getView().animate({
        center: fromLonLat([lon, lat]),
        zoom: 15,
        duration: 450,
      });
    }
  };

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-[28px] font-bold tracking-tight">유고정보 이력</h1>
        <p className="mt-1 text-sm text-gray-500">유고 종류·발생일·차량번호로 조회하고, 목록을 선택하면 카카오지도에 발생 위치를 표시합니다. 최신 1,000건까지 조회합니다.</p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <FilterForm<IncidentFilters>
          fields={incidentFields}
          defaultValues={defaultIncidentFilters}
          values={filters}
          onSearch={handleSearch}
          className="mb-4"
        />
        {errorMessage && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p>}
        {!loading && !errorMessage && rowData.length === 0 && <p role="status" className="mb-4 text-sm text-gray-500">조회 조건에 맞는 유고정보 이력이 없습니다.</p>}

        <div className="flex gap-4" style={{ height: "calc(100vh - 400px)" }}>
          <div className="relative flex-[2] min-w-0 flex flex-col">
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
                rowSelection: "single",
                getRowId: (params) => String(params.data.incident_id),
                suppressRowClickSelection: false,
                onRowClicked: handleRowClicked,
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

          <div className="flex-1 min-w-[340px] flex flex-col">
            <div className="flex h-10 items-center justify-between rounded-t-xl border border-b-0 border-gray-200 bg-gray-50 px-3 text-xs">
              <span className="font-semibold text-gray-700">유고 발생 위치</span>
              <span className="truncate text-gray-500">
                {selectedIncident
                  ? `${selectedIncident.vehicle_no || "차량"} · ${selectedIncident.incident_type || "유고"}`
                  : "목록 클릭 시 위치 표시"}
              </span>
            </div>
            <div className="flex-1 min-h-0">
              <KakaoMap
                mapId="incident-history-map"
                mapRef={mapRef}
                center={MAP_INITIAL_CENTER}
                zoom={13}
                className="h-full w-full !rounded-t-none !rounded-b-xl"
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
