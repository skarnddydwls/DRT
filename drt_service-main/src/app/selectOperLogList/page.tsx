"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Grid from "@/components/Grid";
import { FilterForm } from "@/components/ui/FilterForm";
import { getOperLogList } from "@/lib/api/operLog";
import { getRouteNodes } from "@/lib/api/monitoring";
import { getDispatchList } from "@/lib/api/dispatch";
import { operLogColumnDefs } from "@/features/operLog/columnDefs";
import { defaultFilters, operLogFields } from "@/features/operLog/fieldconfig";
import type { OperLogFilters, OperLogRow } from "@/types/operLog";
import { formatTimestamp } from "@/lib/utils";
import { Map } from "@/lib/maps/kakaoMap";
import { View } from "@/lib/maps/kakaoMap";
import { Feature } from "@/lib/maps/kakaoMap";
import { Point } from "@/lib/maps/kakaoMap";
import { LineString } from "@/lib/maps/kakaoMap";
import { VectorLayer } from "@/lib/maps/kakaoMap";
import { VectorSource } from "@/lib/maps/kakaoMap";
import { Icon, Stroke, Style } from "@/lib/maps/kakaoMap";
import { fromLonLat } from "@/lib/maps/kakaoMap";
import { defaults } from "@/lib/maps/kakaoMap";
import { Overlay } from "@/lib/maps/kakaoMap";

const DEFAULT_MAP_CENTER: [number, number] = [127.766968, 34.512524];
const FIXED_ROUTE_COLOR = "#667eea";
const RESERVED_ROUTE_COLOR = "#ffd400";

export default function OperLogPage() {
  const gridRef = useRef(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markerSourceRef = useRef<VectorSource | null>(null);
  const routeSourceRef = useRef<VectorSource | null>(null);
  const routeStopSourceRef = useRef<VectorSource | null>(null);
  const routeRequestRef = useRef(0);

  const [filters, setFilters] = useState<OperLogFilters>(defaultFilters);
  const [rows, setRows] = useState<OperLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<OperLogRow | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const markerSource = new VectorSource();
    const routeSource = new VectorSource();
    const routeStopSource = new VectorSource();
    const tooltipElement = document.createElement("div");
    tooltipElement.className = "pointer-events-none rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg";
    tooltipElement.style.display = "none";
    document.body.appendChild(tooltipElement);
    const stopOverlay = new Overlay({
      element: tooltipElement,
      positioning: "bottom-center",
      offset: [0, -12],
    });
    const map = new Map({
      target: mapContainerRef.current,
      controls: defaults({ rotate: false }),
      overlays: [stopOverlay],
      layers: [
        new VectorLayer({ source: routeSource }),
        new VectorLayer({ source: routeStopSource }),
        new VectorLayer({ source: markerSource }),
      ],
      view: new View({
        center: fromLonLat(DEFAULT_MAP_CENTER),
        zoom: 15.5,
        maxZoom: 18,
      }),
    });

    map.on("pointermove", (event) => {
      const stopFeature = map.forEachFeatureAtPixel(
        event.pixel,
        (feature) => feature.get("feature_kind") === "route_stop" ? feature : undefined,
      );
      if (stopFeature) {
        const stopName = String(stopFeature.get("point_nm") || "정류장");
        const stopId = String(stopFeature.get("point_id") || "");
        const nameElement = document.createElement("div");
        nameElement.className = "font-semibold";
        nameElement.textContent = stopName;
        const idElement = document.createElement("div");
        idElement.className = "mt-0.5 text-slate-300";
        idElement.textContent = stopId;
        const directionElement = document.createElement("div");
        directionElement.className = "mt-1 text-cyan-300";
        directionElement.textContent = String(stopFeature.get("direction") || "방향 정보 없음");
        tooltipElement.replaceChildren(nameElement, idElement, directionElement);
        tooltipElement.style.display = "block";
        stopOverlay.setPosition(event.coordinate);
      } else {
        tooltipElement.style.display = "none";
        stopOverlay.setPosition(undefined);
      }
    });

    mapRef.current = map;
    markerSourceRef.current = markerSource;
    routeSourceRef.current = routeSource;
    routeStopSourceRef.current = routeStopSource;
    return () => {
      map.setTarget(undefined);
      if (tooltipElement.parentNode === document.body) document.body.removeChild(tooltipElement);
      mapRef.current = null;
      markerSourceRef.current = null;
      routeSourceRef.current = null;
      routeStopSourceRef.current = null;
    };
  }, []);

  const showLogOnMap = async (row: OperLogRow) => {
    const latitude = Number(row.gps_x);
    const longitude = Number(row.gps_y);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    const coordinate = fromLonLat([longitude, latitude]);
    const markerSource = markerSourceRef.current;
    const map = mapRef.current;
    if (!markerSource || !map) return;

    const marker = new Feature({ geometry: new Point(coordinate) });
    marker.setStyle(new Style({
      image: new Icon({
        src: row.vehicle_id === "VH00000002" ? "/bus2.png" : "/bus.png",
        scale: 0.3,
        rotation: (Number(row.heading) || 0) * Math.PI / 180,
        anchor: [0.5, 0.5],
      }),
    }));
    markerSource.clear();
    markerSource.addFeature(marker);
    setSelectedLog(row);
    map.getView().animate({ center: coordinate, zoom: 17, duration: 450 });

    const requestId = ++routeRequestRef.current;
    const dispatchDate = formatTimestamp(row.dispatch_dt || row.oper_dtm, "YYYY-MM-DD");
    try {
      const [routeData, dispatchData] = await Promise.all([
        getRouteNodes({ ROUTE_ID: row.route_id }),
        getDispatchList({ DISPATCH_DT: dispatchDate }),
      ]);
      if (requestId !== routeRequestRef.current) return;

      const dispatchByPoint = new globalThis.Map<string, string>();
      (dispatchData.dispatches ?? [])
        .filter((dispatch) => String(dispatch.route_id) === row.route_id)
        .forEach((dispatch) => {
          dispatchByPoint.set(
            `${String(dispatch.point_id)}:${Number(dispatch.dispatch_seq)}`,
            String(dispatch.ext_dispatch_div ?? ""),
          );
        });

      const nodes = (routeData.nodes ?? [])
        .map((node) => ({
          pointId: String(node.point_id ?? ""),
          pointName: String(node.point_nm ?? ""),
          direction: String(node.direction ?? ""),
          pointType: String(node.point_type ?? ""),
          pointSeq: Number(node.point_seq),
          longitude: Number(node.gps_x),
          latitude: Number(node.gps_y),
          reserveCode: dispatchByPoint.get(`${String(node.point_id)}:${Number(node.point_seq)}`) ?? "",
        }))
        .filter((node) => Number.isFinite(node.longitude) && Number.isFinite(node.latitude))
        .sort((a, b) => a.pointSeq - b.pointSeq);

      const reservedFromPreviousStop: boolean[] = [];
      let previousStopReserved = false;
      nodes.forEach((node, index) => {
        if (node.pointType === "STN") previousStopReserved = Boolean(node.reserveCode);
        reservedFromPreviousStop[index] = previousStopReserved;
      });
      const reservedUntilNextStop: boolean[] = [];
      let nextStopReserved = false;
      for (let index = nodes.length - 1; index >= 0; index -= 1) {
        if (nodes[index].pointType === "STN") nextStopReserved = Boolean(nodes[index].reserveCode);
        reservedUntilNextStop[index] = nextStopReserved;
      }

      const routeFeatures: Feature[] = [];
      for (let index = 0; index < nodes.length - 1; index += 1) {
        const start = nodes[index];
        const end = nodes[index + 1];
        const reserved = reservedFromPreviousStop[index] || reservedUntilNextStop[index + 1];
        const segment = new Feature({
          geometry: new LineString([
            fromLonLat([start.longitude, start.latitude]),
            fromLonLat([end.longitude, end.latitude]),
          ]),
        });
        segment.setStyle(new Style({
          stroke: new Stroke({
            color: reserved ? RESERVED_ROUTE_COLOR : FIXED_ROUTE_COLOR,
            width: reserved ? 6 : 5,
          }),
        }));
        routeFeatures.push(segment);
      }
      routeSourceRef.current?.clear();
      routeSourceRef.current?.addFeatures(routeFeatures);

      const seenStops = new Set<string>();
      const stopFeatures = nodes
        .filter((node) => node.pointType === "STN" && !seenStops.has(node.pointId) && seenStops.add(node.pointId))
        .map((node) => {
          const stop = new Feature({
            geometry: new Point(fromLonLat([node.longitude, node.latitude])),
            feature_kind: "route_stop",
            point_id: node.pointId,
            point_nm: node.pointName,
            direction: node.direction,
          });
          stop.setStyle(new Style({
            image: new Icon({
              src: "/busstop.png",
              scale: 0.09,
              anchor: [0.5, 1],
            }),
          }));
          return stop;
        });
      routeStopSourceRef.current?.clear();
      routeStopSourceRef.current?.addFeatures(stopFeatures);
    } catch (error) {
      if (requestId === routeRequestRef.current) {
        routeSourceRef.current?.clear();
        routeStopSourceRef.current?.clear();
      }
      console.error("Failed to display operated route:", error);
    }
  };

  const fetchLogs = async (searchFilters: OperLogFilters) => {
    setLoading(true);
    try {
      const response = await getOperLogList(searchFilters);
      setRows(response.logs || []);
    } catch (error) {
      console.error("Failed to fetch oper logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(defaultFilters);
  }, []);

  // 2. 조회 버튼 눌렀을 때 상태만 갱신 (프론트 인메모리 필터링)
  const handleSearch = (newFilters: OperLogFilters) => {
    setFilters(newFilters);
  };

  const rowData = useMemo(() => {
    return rows.filter((row) => {
      const formattedDate = formatTimestamp(row.oper_dtm || row.dispatch_dt, "YYYY-MM-DD");
      const matchDate = filters.operDate ? formattedDate === filters.operDate : true;
      const matchRoute = filters.routeNm
        ? String(row.route_nm ?? "").toLowerCase().includes(filters.routeNm.trim().toLowerCase())
        : true;
      const matchVehicle = filters.vehicleNo
        ? String(row.vehicle_no ?? "").toLowerCase().includes(filters.vehicleNo.trim().toLowerCase())
        : true;
      return matchDate && matchRoute && matchVehicle;
    });
  }, [rows, filters]);

  const columnDefs = useMemo(() => operLogColumnDefs, []);

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-[28px] font-bold tracking-tight">운행기록 조회</h1>
        <p className="mt-1 text-sm text-gray-500">운행기록을 조회합니다.</p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <FilterForm<OperLogFilters>
          fields={operLogFields}
          defaultValues={defaultFilters}
          values={filters}
          onSearch={handleSearch}
          className="mb-4"
        />

        <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)] gap-4">
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
                rowSelection: "single",
                suppressRowClickSelection: false,
                onRowClicked: (event) => {
                  if (event.data) void showLogOnMap(event.data as OperLogRow);
                },
              }}
              height="100%"
              enableNumberColoring={true}
            />
          </div>
          <div className="overflow-hidden rounded-2xl border bg-slate-50">
            <div className="flex h-12 items-center justify-between border-b bg-white px-4">
              <span className="text-sm font-semibold">운행 위치</span>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-slate-500"><i className="h-1.5 w-5 rounded-full" style={{ backgroundColor: FIXED_ROUTE_COLOR }} />일반구간</span>
                <span className="flex items-center gap-1.5 text-slate-500"><i className="h-1.5 w-5 rounded-full" style={{ backgroundColor: RESERVED_ROUTE_COLOR }} />예약구간</span>
                <span className="text-muted-foreground">
                  {selectedLog
                    ? `${selectedLog.route_nm || selectedLog.route_id} · ${selectedLog.vehicle_no || selectedLog.vehicle_id} · ${formatTimestamp(selectedLog.oper_dtm, "YYYY-MM-DD HH:mm:ss")}`
                    : "운행로그 행을 선택해 주세요"}
                </span>
              </div>
            </div>
            <div ref={mapContainerRef} className="w-full" style={{ height: "calc(100vh - 448px)" }} />
          </div>
        </div>
      </div>
    </section>
  );
}
