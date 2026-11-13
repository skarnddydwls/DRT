"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Grid from "@/components/Grid";
import GridCsvButton from "@/components/GridCsvButton";
import KakaoMap from "@/components/KakaoMap";
import { FilterForm } from "@/components/ui/FilterForm";
import { cancelCall, getCallList } from "@/lib/api/call";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { callColumnDefs } from "@/features/calls/columnDefs";
import { defaultFilters, callFields } from "@/features/calls/fieldconfig";
import type { CallFilters, CallRow } from "@/types/call";
import type { RowClickedEvent } from "ag-grid-community";
import type { Map } from "@/lib/maps/kakaoMap";
import { Feature } from "@/lib/maps/kakaoMap";
import { Point } from "@/lib/maps/kakaoMap";
import { VectorLayer } from "@/lib/maps/kakaoMap";
import { VectorSource } from "@/lib/maps/kakaoMap";
import { CircleStyle, Fill, Stroke, Style } from "@/lib/maps/kakaoMap";
import { fromLonLat } from "@/lib/maps/kakaoMap";

const MAP_INITIAL_CENTER: [number, number] = [127.748, 34.525];

export default function CallsPage() {
  const gridRef = useRef(null);
  const mapRef = useRef<Map | null>(null);
  const markerSourceRef = useRef<VectorSource | null>(null);

  const [filters, setFilters] = useState<CallFilters>(defaultFilters);
  const [allRows, setAllRows] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCall, setSelectedCall] = useState<CallRow | null>(null);
  const [cancelTarget, setCancelTarget] = useState<CallRow | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [cancelError, setCancelError] = useState("");
  const cancellingRef = useRef(false);
  const listRequestRef = useRef(0);

  // API 호출로 데이터 가져오기
  const fetchCallList = useCallback(async (searchFilters: CallFilters) => {
    const requestId = ++listRequestRef.current;
    setLoading(true);
    setError("");
    try {
      const response = await getCallList(searchFilters);
      if (requestId !== listRequestRef.current) return;
      setAllRows(response.calls ?? []);
      setSelectedCall(current => current ? response.calls.find(row => row.device_id === current.device_id && row.call_dtm === current.call_dtm) ?? null : null);
    } catch (error) {
      if (requestId !== listRequestRef.current) return;
      setError("예약 내역을 불러오지 못했습니다. 다시 조회해주세요.");
      console.error("Failed to fetch call list:", error);
    } finally {
      if (requestId === listRequestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCallList(defaultFilters);
  }, [fetchCallList]);

  const handleSearch = (newFilters: CallFilters) => {
    setFilters(newFilters);
    setSelectedCall(null);
    setMessage("");
    void fetchCallList(newFilters);
  };

  const handleCancel = async () => {
    if (!cancelTarget || cancellingRef.current) return;
    cancellingRef.current = true;
    setCancelling(true);
    setCancelError("");
    try {
      const result = await cancelCall(cancelTarget);
      setMessage(result.alreadyCancelled ? "이미 취소된 예약입니다." : "예약을 취소했습니다.");
      setAllRows(rows => rows.map(row => row.device_id === cancelTarget.device_id && row.call_dtm === cancelTarget.call_dtm
        ? { ...row, rsv_status: "CANCEL", cancel_reason: result.alreadyCancelled ? row.cancel_reason : "ADMIN_CANCELLED" } : row));
      setSelectedCall(null);
      setCancelTarget(null);
      await fetchCallList(filters);
    } catch (error) {
      setCancelError(error instanceof Error ? error.message : "예약취소에 실패했습니다.");
      await fetchCallList(filters);
    } finally {
      cancellingRef.current = false;
      setCancelling(false);
    }
  };

  const rowData = useMemo(() => {
    return allRows.filter((row) => {
      const matchDate = filters.callDatetime
        ? String(row.call_dtm ?? "").startsWith(filters.callDatetime)
        : true;
      const matchRoute = filters.routeNm
        ? String(row.route_nm ?? "")
          .toLowerCase()
          .includes(filters.routeNm.trim().toLowerCase())
        : true;
      const matchStart = filters.startPointNm
        ? String(row.start_point_nm ?? "")
          .toLowerCase()
          .includes(filters.startPointNm.trim().toLowerCase())
        : true;
      const matchEnd = filters.endPointNm
        ? String(row.end_point_nm ?? "")
          .toLowerCase()
          .includes(filters.endPointNm.trim().toLowerCase())
        : true;
      return matchDate && matchRoute && matchStart && matchEnd;
    });
  }, [allRows, filters]);

  const columnDefs = useMemo(() => callColumnDefs, []);

  // 그리드에서 행 클릭 시 지도에 마커 표시 및 위치 이동
  const handleRowClicked = (event: RowClickedEvent<CallRow>) => {
    const row = event.data;
    if (!row) return;
    setSelectedCall(row);

    const lon = Number(row.gps_x);
    const lat = Number(row.gps_y);
    if (!lon || !lat || isNaN(lon) || isNaN(lat)) return;

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
            fill: new Fill({ color: "#2563eb" }),
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
      {/* 페이지 제목 */}
      <div className="mb-6">
        <h1 className="text-[28px] font-bold tracking-tight">호출기록 조회</h1>
        <p className="mt-1 text-sm text-gray-500">앱 예약 내역과 이용 상태를 조회합니다. 예약완료는 이용 전 예약이며, 선택 후 관리자 취소가 가능합니다.</p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <GridCsvButton gridRef={gridRef} fileName="호출기록" disabled={loading || rowData.length === 0} />
          <Button variant="destructive" disabled={loading || cancelling || selectedCall?.rsv_status !== "WAIT"}
            onClick={() => { setCancelError(""); setMessage(""); setCancelTarget(selectedCall); }}>
            선택 예약 취소
          </Button>
        </div>
        {message && <p role="status" className="mb-3 text-sm text-green-700">{message}</p>}
        {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
        <FilterForm<CallFilters>
          fields={callFields}
          defaultValues={defaultFilters}
          values={filters}
          onSearch={handleSearch}
          className="mb-4"
        />

        <div className="flex gap-4" style={{ height: "calc(100vh - 400px)" }}>
          {/* 그리드 영역 (2) */}
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

          {/* 지도 영역 (1) */}
          <div className="flex-1 min-w-[340px] flex flex-col">
            <div className="flex h-10 items-center justify-between rounded-t-xl border border-b-0 border-gray-200 bg-gray-50 px-3 text-xs">
              <span className="font-semibold text-gray-700">호출 위치</span>
              <span className="truncate text-gray-500">
                {selectedCall
                  ? `${selectedCall.route_nm || "호출"} · ${selectedCall.start_point_nm || ""}${selectedCall.end_point_nm ? ` → ${selectedCall.end_point_nm}` : ""}`
                  : "목록 클릭 시 위치 표시"}
              </span>
            </div>
            <div className="flex-1 min-h-0">
              <KakaoMap
                mapId="calls-map"
                mapRef={mapRef}
                center={MAP_INITIAL_CENTER}
                zoom={13}
                className="h-full w-full !rounded-t-none !rounded-b-xl"
              />
            </div>
          </div>
        </div>
      </div>
      <Dialog open={Boolean(cancelTarget)} onOpenChange={open => { if (!open && !cancelling) setCancelTarget(null); }}>
        <DialogContent showCloseButton={!cancelling}>
          <DialogHeader>
            <DialogTitle>예약을 취소하시겠습니까?</DialogTitle>
            <DialogDescription>취소하면 앱 예약 상태와 해당 예약의 승차 인원이 함께 반영됩니다. 환승 예약은 전체 구간이 취소됩니다.</DialogDescription>
          </DialogHeader>
          {cancelTarget && <div className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
            <p>{cancelTarget.route_nm} · {cancelTarget.rsv_num}명</p>
            <p>{cancelTarget.start_point_nm} → {cancelTarget.end_point_nm}</p>
            <p>승차예정: {cancelTarget.schedule_ride_dtm || "-"}</p>
            <p>예약일시: {cancelTarget.call_dtm}</p>
          </div>}
          {cancelError && <p role="alert" className="text-sm text-red-600">{cancelError}</p>}
          <DialogFooter>
            <Button variant="outline" disabled={cancelling} onClick={() => setCancelTarget(null)}>닫기</Button>
            <Button variant="destructive" disabled={cancelling} onClick={handleCancel}>{cancelling ? "취소 중..." : "예약취소 확인"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
