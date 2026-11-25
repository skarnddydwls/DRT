"use client";

import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { Map, View } from "@/lib/maps/kakaoMap";
import { defaults, FullScreen } from "@/lib/maps/kakaoMap";
import { fromLonLat } from "@/lib/maps/kakaoMap";
import { vehicleCoordinates } from "@/lib/maps/vehicleCoordinates";
import { VectorLayer } from "@/lib/maps/kakaoMap";
import { VectorSource } from "@/lib/maps/kakaoMap";
import { Feature } from "@/lib/maps/kakaoMap";
import { Point } from "@/lib/maps/kakaoMap";
import { LineString } from "@/lib/maps/kakaoMap";
import { Style, Stroke, Icon } from "@/lib/maps/kakaoMap";
import { Overlay } from "@/lib/maps/kakaoMap";
import { getActiveRouteNodes, getRouteNodes, getVehicleMarkers, getBusArrivals } from "@/lib/api/monitoring";
import { getDispatchList } from "@/lib/api/dispatch";
import type { ActiveRouteNode, VehicleMarker } from "@/types/monitoring";
import { getStopList, type StopRow } from "@/lib/api/marker";
import {
  buildVehicleGridRows,
  cancelVehicleAnimations,
  mergeVehicleMarkers,
  removeVehicleMarker,
  syncVehicleMarkerFeatures,
  type VehicleUpdateMode,
} from "@/features/monitoring/vehicleMarkers";
import { Button } from "@/components/ui/button";
import Grid from "@/components/Grid";
import type { ColDef } from "ag-grid-community";
import {
  MONITORING_WS_URL,
  MONITORING_VEHICLE_TOPIC,
} from "@/config/monitoring";
import { useVehicleLocationStomp, type StompConnectionStatus, } from "@/features/monitoring/useVehicleLocationStomp";

const USIL_INTERSECTION_CENTER: [number, number] = [127.766968, 34.512524];
const SINGI_PORT_CENTER: [number, number] = [127.74364092364029, 34.59929482516387];
const GEUMODO_OVERVIEW_ZOOM = 15.5;
const FIXED_ROUTE_COLOR = "#667eea";
const RESERVED_ROUTE_COLOR = "#ffd400";
const VEHICLE_MOVE_DURATION_MS = 950;
// STOMP 연결 상태별 배지 라벨 및 스타일 매핑
const STOMP_STATUS_META: Record<
  StompConnectionStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  idle: {
    label: "실시간 대기",
    badgeClass: "bg-gray-100 text-gray-600 border-gray-200",
    dotClass: "bg-gray-400",
  },
  connecting: {
    label: "연결 중...",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    dotClass: "bg-amber-500 animate-pulse",
  },
  connected: {
    label: "실시간 연결됨",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
  disconnected: {
    label: "연결 끊김",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    dotClass: "bg-rose-500",
  },
  error: {
    label: "연결 오류",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-300",
    dotClass: "bg-rose-600",
  },
};

export default function MonitoringPage() {
  const mapRef = useRef<Map | null>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);
  const vehicleSourceRef = useRef<VectorSource | null>(null);
  const stopSourceRef = useRef<VectorSource | null>(null);
  const overlayRef = useRef<Overlay | null>(null);
  const stopsLoadedRef = useRef(false);
  const activeRouteSignatureRef = useRef("");
  const routeNamesRef = useRef<Record<string, string>>({});
  const routeIdsRef = useRef<Record<string, string>>({});
  const latestVehiclesRef = useRef<Record<string, VehicleMarker>>({});
  const gridRef = useRef(null);
  const [gridRows, setGridRows] = useState<Record<string, unknown>[]>([]);
  const [routeOptions, setRouteOptions] = useState<{ key: string; routeId: string; vehicleId: string; name: string }[]>([]);
  const [selectedRoute, setSelectedRoute] = useState("");
  const selectedRouteRef = useRef("");
  const routeRequestRef = useRef(0);
  const routeInFlightRef = useRef<string | null>(null);
  const focusRouteRef = useRef(false);
  const [routeError, setRouteError] = useState("");
  const [operationNotices, setOperationNotices] = useState<
    { id: string; type: "start" | "end"; vehicleNo: string; routeName: string }[]
  >([]);
  const noticeTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const pushOperationNotice = useCallback(
    (type: "start" | "end", vehicle: VehicleMarker) => {
      const id = `${type}-${vehicle.vehicle_id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const vehicleNo = vehicle.vehicle_no || vehicle.vehicle_id;
      const routeName =
        vehicle.route_nm || routeNamesRef.current[vehicle.vehicle_id] || vehicle.route_id || "";
      setOperationNotices((prev) => [...prev.slice(-3), { id, type, vehicleNo, routeName }]);

      const timer = setTimeout(() => {
        noticeTimersRef.current.delete(timer);
        setOperationNotices((prev) => prev.filter((item) => item.id !== id));
      }, 5000);
      noticeTimersRef.current.add(timer);
    },
    []
  );

  useEffect(() => {
    const timers = noticeTimersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  // 모니터링 그리드 컬럼 정의 (2:1 우측 배치용)
  const monitoringColumnDefs: ColDef[] = useMemo(
    () => [
      {
        headerName: "번호",
        valueGetter: "node.rowIndex + 1",
        width: 100,
        minWidth: 100,
        resizable: false,
        suppressSizeToFit: true,
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "차량번호",
        field: "vehicle_no",
        minWidth: 100,
        flex: 1,
        cellStyle: { textAlign: "center" },
      },
      {
        headerName: "노선명",
        field: "route_nm",
        minWidth: 140,
        flex: 1.8,
      },
    ],
    []
  );

  // 최근 위치가 있는 차량의 현재 일배차 노선만 지도에 표시
  const loadActiveRouteNodes = useCallback(async () => {
    const selection = selectedRouteRef.current;
    if (routeInFlightRef.current === selection) return;
    routeInFlightRef.current = selection;
    const requestId = ++routeRequestRef.current;
    try {
      let nodes: ActiveRouteNode[];
      if (selection) {
        const [routeId, vehicleId] = selection.split("|");
        const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
        const [route, day] = await Promise.all([
          getRouteNodes({ ROUTE_ID: routeId, DISPATCH_DT: date, VEHICLE_ID: vehicleId, OPERATING_ONLY: true }),
          getDispatchList({ DISPATCH_DT: date }),
        ]);
        const dispatch = day.dispatches.filter(row => row.route_id === routeId && String(row.vehicle_id ?? "") === vehicleId);
        nodes = route.nodes.map(node => ({
          ...node, gps_x: Number(node.gps_x), gps_y: Number(node.gps_y),
          vehicle_id: vehicleId, route_nm: dispatch[0]?.route_nm ?? routeId,
          point_nm: node.point_nm ?? null,
          ext_dispatch_div: node.ext_dispatch_div ?? null,
        }));
      } else {
        const response = await getActiveRouteNodes();
        nodes = response.nodes || [];
      }
      if (requestId !== routeRequestRef.current || selection !== selectedRouteRef.current) return;
      nodes = nodes.filter(node => node.gps_x != null && node.gps_y != null)
        .map(node => ({ ...node, gps_x: Number(node.gps_x), gps_y: Number(node.gps_y) }));
      if (!selection) {
        routeNamesRef.current = Object.fromEntries(nodes.map(node => [node.vehicle_id, node.route_nm ?? node.route_id]));
        routeIdsRef.current = Object.fromEntries(nodes.map(node => [node.vehicle_id, node.route_id]));
      }
      setRouteError(selection && !nodes.length ? "선택한 노선에 등록된 지도 좌표가 없습니다." : "");
      const vectorSource = vectorSourceRef.current;
      if (!vectorSource) {
        console.warn("vectorSource is not ready");
        return;
      }

      const signature = selection + nodes.map((node) =>
        `${node.route_id}:${node.vehicle_id}:${node.point_id}:${node.point_seq}:${node.path_segment ?? 0}:${node.ext_dispatch_div ?? ""}:${node.gps_x}:${node.gps_y}`
      ).join("|");
      if (signature === activeRouteSignatureRef.current) return;

      const routes = nodes.reduce((acc, node) => {
        const key = `${node.route_id}-${node.vehicle_id}`;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(node);
        return acc;
      }, {} as Record<string, ActiveRouteNode[]>);

      const routeFeatures: Feature[] = [];
      Object.values(routes).forEach((routeNodes) => {
        const sorted = [...routeNodes]
          .filter((node) => vehicleCoordinates(node) && (node.gps_x !== 0 || node.gps_y !== 0))
          .sort((a, b) => a.point_seq - b.point_seq);

        // 예약구간 코드는 정류장에만 있으므로, 정류장 사이의 경유 노드에도
        // 양쪽 정류장의 예약 여부를 전달해 전체 구간을 한 색으로 표시한다.
        const reservedFromPreviousStop: boolean[] = [];
        let previousStopReserved = false;
        sorted.forEach((node, index) => {
          if (node.point_type === "STN") {
            previousStopReserved = Boolean(node.ext_dispatch_div);
          }
          reservedFromPreviousStop[index] = previousStopReserved;
        });

        const reservedUntilNextStop: boolean[] = [];
        let nextStopReserved = false;
        for (let index = sorted.length - 1; index >= 0; index -= 1) {
          const node = sorted[index];
          if (node.point_type === "STN") {
            nextStopReserved = Boolean(node.ext_dispatch_div);
          }
          reservedUntilNextStop[index] = nextStopReserved;
        }

        for (let index = 0; index < sorted.length - 1; index += 1) {
          const start = sorted[index];
          const end = sorted[index + 1];
          if ((start.path_segment ?? 0) !== (end.path_segment ?? 0)) continue;
          const extensionSection = start.route_id !== "RT00000016" || (start.point_seq >= 131 && end.point_seq <= 168);
          const reserved = extensionSection && (reservedFromPreviousStop[index] || reservedUntilNextStop[index + 1]);
          const segment = new Feature({
            geometry: new LineString([
              fromLonLat([start.gps_x, start.gps_y]),
              fromLonLat([end.gps_x, end.gps_y]),
            ]),
            route_id: start.route_id,
            vehicle_id: start.vehicle_id,
            feature_kind: "route",
            reserved,
          });
          segment.setStyle(new Style({
            stroke: new Stroke({
              color: reserved ? RESERVED_ROUTE_COLOR : FIXED_ROUTE_COLOR,
              width: reserved ? 6 : 5,
            }),
          }));
          routeFeatures.push(segment);
        }
      });
      vectorSource.clear();
      vectorSource.addFeatures(routeFeatures);
      activeRouteSignatureRef.current = signature;
      if (focusRouteRef.current && nodes.length) {
        const first = nodes.find(node => vehicleCoordinates(node));
        if (first) mapRef.current?.getView().animate({ center: fromLonLat([Number(first.gps_x), Number(first.gps_y)]), duration: 450 });
        focusRouteRef.current = false;
      }
    } catch (error) {
      if (requestId !== routeRequestRef.current) return;
      setRouteError("선택한 노선을 불러오지 못했습니다. 백엔드 연결을 확인해주세요.");
      console.error("Failed to load active route nodes:", error);
    } finally {
      if (requestId === routeRequestRef.current) routeInFlightRef.current = null;
    }
  }, []);

  const selectRoute = (key: string, focus = true) => {
    selectedRouteRef.current = key;
    setSelectedRoute(key);
    activeRouteSignatureRef.current = "";
    focusRouteRef.current = Boolean(key) && focus;
    vectorSourceRef.current?.clear();
    void loadActiveRouteNodes();
  };

  useEffect(() => {
    let disposed = false;
    const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
    getDispatchList({ DISPATCH_DT: date }).then(response => {
      if (disposed) return;
      const options = new globalThis.Map<string, { key: string; routeId: string; vehicleId: string; name: string }>();
      response.dispatches.forEach(row => {
        const vehicleId = String(row.vehicle_id ?? "");
        const key = `${row.route_id}|${vehicleId}`;
        options.set(key, { key, routeId: row.route_id, vehicleId, name: row.route_nm || row.route_id });
      });
      setRouteOptions([...options.values()].sort((a, b) => a.name.localeCompare(b.name, "ko", { numeric: true })));
    }).catch(() => { if (!disposed) setRouteError("일배차 노선 목록을 불러오지 못했습니다."); });
    return () => { disposed = true; };
  }, []);

  // 정류장 데이터 로드 및 지도에 표시 (한 번만 실행)
  const loadStops = useCallback(async () => {
    if (stopsLoadedRef.current) return;

    try {
      const response = await getStopList();
      const stops = response.stops || [];
      const stopSource = stopSourceRef.current;
      const map = mapRef.current;
      if (!stopSource || !map) {
        console.warn("stopSource or map is not ready");
        return;
      }

      stopSource.clear();

      stops.forEach((stop: StopRow) => {
        const coord = fromLonLat([stop.gps_x, stop.gps_y]);
        const feature = new Feature({
          geometry: new Point(coord),
          feature_kind: "stop",
          stn_id: stop.stn_id,
          stn_nm: stop.stn_nm,
          stn_no: stop.stn_no,
          stn_type: stop.stn_type,
          remark: stop.remark,
          gps_x: stop.gps_x,
          gps_y: stop.gps_y,
          direction: stop.direction,
        });

        feature.setStyle(
          new Style({
            image: new Icon({
              src: "/busstop.png",
              scale: 0.1,
              anchor: [0.5, 1],
            }),
          })
        );

        stopSource.addFeature(feature);
      });

      stopsLoadedRef.current = true;
    } catch (error) {
      console.error("Failed to load stops:", error);
    }
  }, []);

  // 수신된 차량 위치 데이터를 지도와 그리드에 반영 (REST 스냅샷 / STOMP 델타 공용)
  const applyVehicleMarkers = useCallback(
    (
      vehicles: VehicleMarker[],
      options: { mode?: VehicleUpdateMode; moveDurationMs?: number } = {}
    ) => {
      const vehicleSource = vehicleSourceRef.current;
      const map = mapRef.current;
      if (!vehicleSource || !map) {
        console.warn("vehicleSource or map is not ready");
        return;
      }

      const mode = options.mode ?? "snapshot";
      const moveDurationMs = options.moveDurationMs ?? VEHICLE_MOVE_DURATION_MS;
      const { nextVehicles, updatedVehicles } = mergeVehicleMarkers(
        latestVehiclesRef.current,
        vehicles,
        mode
      );

      // STOMP(delta)로 신규 차량이 처음 등장하거나 노선이 바뀌면 활성 노선을 1회 재조회
      const hasNewOrChangedRoute =
        mode === "delta" &&
        updatedVehicles.some((vehicle) => {
          const prev = latestVehiclesRef.current[vehicle.vehicle_id];
          return !prev || Boolean(vehicle.route_id && vehicle.route_id !== prev.route_id);
        });

      latestVehiclesRef.current = nextVehicles;
      setGridRows(
        buildVehicleGridRows(
          nextVehicles,
          routeNamesRef.current,
          routeIdsRef.current
        )
      );

      syncVehicleMarkerFeatures(vehicleSource, updatedVehicles, {
        mode,
        moveDurationMs,
      });

      if (hasNewOrChangedRoute) {
        void loadActiveRouteNodes();
      }
    },
    [loadActiveRouteNodes]
  );

  // 버스 마커 초기 스냅샷 조회 (추후 STOMP 연결/재연결 시 초기 동기화용으로 유지)
  const loadVehicleMarkers = useCallback(async () => {
    try {
      const response = await getVehicleMarkers();
      applyVehicleMarkers(response.vehicles || [], { mode: "snapshot" });
    } catch (error) {
      console.error("Failed to load vehicle markers:", error);
    }
  }, [applyVehicleMarkers]);

  const handleStompVehicles = useCallback(
    (vehicles: VehicleMarker[]) => {
      const activeVehicles: VehicleMarker[] = [];
      const endedVehicles: VehicleMarker[] = [];

      vehicles.forEach((vehicle) => {
        if (vehicle.eventType === "start") {
          pushOperationNotice("start", vehicle);
          activeVehicles.push(vehicle);
        } else if (vehicle.eventType === "end") {
          pushOperationNotice("end", vehicle);
          endedVehicles.push(vehicle);
        } else {
          activeVehicles.push(vehicle);
        }
      });

      if (activeVehicles.length > 0) {
        applyVehicleMarkers(activeVehicles, { mode: "delta" });
      }

      if (endedVehicles.length > 0 && vehicleSourceRef.current) {
        let nextVehicles = latestVehiclesRef.current;
        endedVehicles.forEach((vehicle) => {
          nextVehicles = removeVehicleMarker(
            vehicleSourceRef.current!,
            nextVehicles,
            vehicle.vehicle_id
          );
        });
        latestVehiclesRef.current = nextVehicles;
        setGridRows(
          buildVehicleGridRows(
            nextVehicles,
            routeNamesRef.current,
            routeIdsRef.current
          )
        );
      }
    },
    [applyVehicleMarkers, pushOperationNotice]
  );

  const { status: stompStatus } = useVehicleLocationStomp({
    brokerURL: MONITORING_WS_URL,
    topic: MONITORING_VEHICLE_TOPIC,
    onVehicles: handleStompVehicles,
    onConnected: () => {
      void loadVehicleMarkers();
    },
  });

  const isStompConnected = stompStatus === "connected";

  // STOMP 미연결 시에만 기존 5초 폴링으로 자동 폴백 (연결되면 자동 중지)
  useEffect(() => {
    if (isStompConnected) return;
    const interval = setInterval(() => {
      void loadActiveRouteNodes();
      void loadVehicleMarkers();
    }, 5000);
    return () => clearInterval(interval);
  }, [isStompConnected, loadActiveRouteNodes, loadVehicleMarkers]);

  // 지도 초기화 (벡터 레이어 포함)
  useEffect(() => {
    stopsLoadedRef.current = false;
    activeRouteSignatureRef.current = "";
    const vectorSource = new VectorSource();
    const vectorLayer = new VectorLayer({
      source: vectorSource,
    });

    const stopSource = new VectorSource();
    const stopLayer = new VectorLayer({
      source: stopSource,
    });

    const vehicleSource = new VectorSource();
    const vehicleLayer = new VectorLayer({
      source: vehicleSource,
    });

    // 툴팁 오버레이 생성
    const tooltipElement = document.createElement("div");
    tooltipElement.className =
      "bg-black text-white text-xs rounded px-2 py-1 pointer-events-none";
    tooltipElement.style.display = "none";
    document.body.appendChild(tooltipElement);

    const overlay = new Overlay({
      element: tooltipElement,
      positioning: "bottom-center",
      offset: [0, -10],
    });

    const map = new Map({
      controls: defaults({ zoom: true, rotate: false }).extend([new FullScreen()]),
      layers: [
        vectorLayer,
        stopLayer,
        vehicleLayer,
      ],
      target: "monitoring-map",
      overlays: [overlay],
      view: new View({
        center: fromLonLat(USIL_INTERSECTION_CENTER),
        zoom: GEUMODO_OVERVIEW_ZOOM,
        maxZoom: 18,
      }),
    });

    const mapContainer = document.getElementById("monitoring-map");
    const resizeObserver = new ResizeObserver(() => {
      map.updateSize();
    });
    if (mapContainer) {
      resizeObserver.observe(mapContainer);
    }

    // 마우스 호버 이벤트 처리
    let hoveredFeature: Feature | null = null;
    const bitStationNumbers = new Set(["3259316", "3251064"]);
    const defaultTooltipClass = "bg-black text-white text-xs rounded px-2 py-1 pointer-events-none";
    const bitTooltipClass = "overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl pointer-events-none";
    const bitCache: Record<string, { expiresAt: number; html: string }> = {};
    const escapeHtml = (value: unknown) => String(value ?? "").replace(
      /[&<>'"]/g,
      (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character,
    );
    const loadBitHtml = async (stationNo: string) => {
      const cached = bitCache[stationNo];
      if (cached && cached.expiresAt > Date.now()) return cached.html;

      const data = await getBusArrivals(stationNo);

      const arrivals = data.arrivals ?? [];
      const html = arrivals.length > 0
        ? arrivals.map((arrival) => {
          const minutes = Math.max(1, Math.ceil(arrival.arrivalSeconds / 60));
          return `<div class="flex items-center gap-3 border-t border-slate-100 px-4 py-3 first:border-t-0">
            <span class="rounded-md bg-cyan-500 px-2 py-1 text-[11px] font-bold text-white">${escapeHtml(arrival.routeNo)}번</span>
            <div class="min-w-0 flex-1">
              <div class="truncate text-xs font-medium text-slate-700">${escapeHtml(arrival.routeType || arrival.vehicleType || "운행 버스")}</div>
              <div class="mt-0.5 text-[11px] text-slate-400">${arrival.remainingStops}정류장 전</div>
            </div>
            <div class="whitespace-nowrap text-sm font-bold text-rose-500">${minutes}분 후</div>
          </div>`;
        }).join("")
        : `<div class="border-t border-slate-100 px-4 py-5 text-center text-xs text-slate-400">${escapeHtml(data.message || "현재 도착 예정 버스가 없습니다.")}</div>`;
      bitCache[stationNo] = { expiresAt: Date.now() + 20_000, html };
      return html;
    };

    map.on("pointermove", (e) => {
      const feature = map.forEachFeatureAtPixel(
        e.pixel,
        (f) => f as Feature
      ) as Feature | null;

      if (feature?.get("feature_kind") === "vehicle") {
        // 버스 마커에 호버
        if (hoveredFeature !== feature) {
          hoveredFeature = feature;
          const vehicleNo = feature.get("vehicle_no");
          const vehicleId = feature.get("vehicle_id");
          const speed = feature.get("speed");
          const operDtm = feature.get("oper_dtm");
          const heading = feature.get("heading");

          const date = new Date(operDtm);
          const dateStr = `${date.getFullYear()}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}-${String(date.getDate()).padStart(
            2,
            "0"
          )} ${String(date.getHours()).padStart(2, "0")}:${String(
            date.getMinutes()
          ).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;

          // m/s를 km/h로 변환 (1 m/s = 3.6 km/h)
          const speedKmh = Number.isFinite(Number(speed)) ? Number(speed) * 3.6 : 0;
          tooltipElement.className = defaultTooltipClass;
          tooltipElement.innerHTML = `
            <div class="font-semibold">${escapeHtml(vehicleNo)}</div>
            <div>차량ID: ${escapeHtml(vehicleId)}</div>
            <div>속도: ${escapeHtml(speedKmh.toFixed(2))} km/h</div>
            <div>방향: ${escapeHtml(heading)}°</div>
            <div>시간: ${escapeHtml(dateStr)}</div>
          `;
          tooltipElement.style.display = "block";
          overlay.setPosition(e.coordinate);
        }
      } else if (feature?.get("feature_kind") === "stop") {
        if (hoveredFeature !== feature) {
          hoveredFeature = feature;
          const stnNm = feature.get("stn_nm");
          const stnNo = String(feature.get("stn_no") ?? "");
          const direction = feature.get("direction");
          const isBitStation = bitStationNumbers.has(stnNo);

          tooltipElement.className = isBitStation ? bitTooltipClass : defaultTooltipClass;
          const baseHtml = isBitStation
            ? `<div class="min-w-[320px]">
                <div class="bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-3 text-white">
                  <div class="text-[15px] font-bold">${escapeHtml(stnNm)}</div>
                  <div class="mt-1 flex gap-2 text-[11px] text-cyan-50">
                    <span>${escapeHtml(stnNo)}</span><span>·</span><span>${escapeHtml(direction)}</span>
                  </div>
                </div>
                <div class="flex items-center justify-between bg-slate-50 px-4 py-2">
                  <span class="text-xs font-semibold text-slate-600">실시간 버스 도착정보</span>
                  <span class="text-[11px] text-slate-400">20초 단위 갱신 ↻</span>
                </div>
              </div>`
            : `<div>정류장명: ${escapeHtml(stnNm)}</div>
               <div>정류장번호: ${escapeHtml(stnNo)}</div>
               <div>방향: ${escapeHtml(direction)}</div>`;
          tooltipElement.innerHTML = baseHtml;
          tooltipElement.style.display = "block";
          overlay.setPosition(e.coordinate);

          if (isBitStation) {
            tooltipElement.innerHTML = `${baseHtml}<div class="border-t border-slate-100 px-4 py-5 text-center text-xs text-slate-400">도착정보를 불러오는 중...</div>`;
            void loadBitHtml(stnNo)
              .then((bitHtml) => {
                if (hoveredFeature === feature) tooltipElement.innerHTML = `${baseHtml}${bitHtml}`;
              })
              .catch(() => {
                if (hoveredFeature === feature) {
                  tooltipElement.innerHTML = `${baseHtml}<div class="border-t border-slate-100 px-4 py-5 text-center text-xs text-rose-500">BIT 정보를 불러오지 못했습니다.</div>`;
                }
              });
          }
        }
      } else {
        // 호버 해제
        if (hoveredFeature) {
          hoveredFeature = null;
          tooltipElement.style.display = "none";
          overlay.setPosition(undefined);
        }
      }
    });

    mapRef.current = map;
    activeRouteSignatureRef.current = "";
    stopsLoadedRef.current = false;
    vectorSourceRef.current = vectorSource;
    vehicleSourceRef.current = vehicleSource;
    stopSourceRef.current = stopSource;
    overlayRef.current = overlay;

    loadStops();

    // 버스 데이터 초기 로드 및 주기적 업데이트
    loadActiveRouteNodes();
    loadVehicleMarkers();

    return () => {
      ++routeRequestRef.current;
      routeInFlightRef.current = null;
      cancelVehicleAnimations(vehicleSource);
      latestVehiclesRef.current = {};
      map.setTarget(undefined);
      mapRef.current = null;
      vectorSourceRef.current = null;
      vehicleSourceRef.current = null;
      stopSourceRef.current = null;
      activeRouteSignatureRef.current = "";
      resizeObserver.disconnect();
      // tooltipElement가 body의 자식인지 확인 후 제거
      if (tooltipElement && tooltipElement.parentNode === document.body) {
        document.body.removeChild(tooltipElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 의존성 제거: 지도는 한 번만 초기화

  const moveMapCenter = (center: [number, number]) => {
    mapRef.current?.getView().animate({
      center: fromLonLat(center),
      zoom: GEUMODO_OVERVIEW_ZOOM,
      duration: 450,
    });
  };

  return (
    <section>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-[28px] font-bold tracking-tight">모니터링</h1>
          <span
            role="status"
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STOMP_STATUS_META[stompStatus].badgeClass}`}
          >
            <span
              className={`h-2 w-2 rounded-full ${STOMP_STATUS_META[stompStatus].dotClass}`}
            />
            {STOMP_STATUS_META[stompStatus].label}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          지도에서 버스 이동경로를 실시간으로 표출합니다.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <label className="mb-4 flex items-center gap-3 text-sm font-semibold">
          노선 선택
          <select className="min-w-64 rounded-lg border bg-white px-3 py-2" value={selectedRoute} onChange={event => selectRoute(event.target.value)}>
            <option value="">운행 중인 전체 노선</option>
            {routeOptions.map(route => <option key={route.key} value={route.key}>{route.name}</option>)}
          </select>
        </label>
        {routeError && <p role="status" className="mb-3 text-sm text-rose-600">{routeError}</p>}
        {/* 지도(2) : 그리드(1) 2:1 레이아웃 */}
        <div
          className="grid grid-cols-[minmax(0,2fr)_minmax(360px,1fr)] gap-4"
          style={{ height: "calc(100vh - 310px)" }}
        >
          {/* 좌측: 지도 영역 (비율 2) */}
          <div className="relative min-h-0">
            <div
              id="monitoring-map"
              className="relative overflow-hidden rounded-[24px] border border-gray-200 h-full w-full"
            >
              {/* 운행 시작 / 종료 실시간 오버레이 */}
              {operationNotices.length > 0 && (
                <div
                  role="status"
                  aria-live="polite"
                  className="pointer-events-none absolute left-1/2 top-4 z-20 flex -translate-x-1/2 flex-col items-center gap-2"
                >
                  {operationNotices.map((notice) => (
                    <div
                      key={notice.id}
                      className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-lg backdrop-blur-sm ${
                        notice.type === "start"
                          ? "border-emerald-300 bg-emerald-50/95 text-emerald-800"
                          : "border-rose-300 bg-rose-50/95 text-rose-800"
                      }`}
                    >
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-bold text-white ${
                          notice.type === "start" ? "bg-emerald-600" : "bg-rose-600"
                        }`}
                      >
                        {notice.type === "start" ? "운행 시작" : "운행 종료"}
                      </span>
                      <span>{notice.vehicleNo}</span>
                      {notice.routeName && (
                        <span className="text-xs font-normal opacity-80">
                          ({notice.routeName})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="absolute right-4 top-4 z-10 flex gap-3">
                <Button
                  variant="outline"
                  className="h-12 border-green-500 bg-white px-7 text-green-600 hover:bg-green-50"
                  onClick={() => moveMapCenter(USIL_INTERSECTION_CENTER)}>
                  금오도
                </Button>
                <Button
                  variant="outline"
                  className="h-12 border-blue-500 bg-white px-7 text-blue-600 hover:bg-blue-50"
                  onClick={() => moveMapCenter(SINGI_PORT_CENTER)}>
                  신기항
                </Button>
              </div>
              {/* 범례 */}
              <div className="absolute bottom-9 left-2.5 bg-white rounded-lg shadow-lg p-4 z-10">
                <div className="space-y-2">
                  <div className="flex items-center gap-2"><span className="h-1 w-8 rounded" style={{ backgroundColor: FIXED_ROUTE_COLOR }} /><span className="text-sm">고정구간</span></div>
                  <div className="flex items-center gap-2"><span className="h-1.5 w-8 rounded" style={{ backgroundColor: RESERVED_ROUTE_COLOR }} /><span className="text-sm">예약구간</span></div>
                  <div className="flex items-center gap-2">
                    <img
                      src="/bus.png"
                      alt="1호차"
                      className="w-8 h-8 object-contain"
                    />
                    <span className="text-sm">1호차</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <img
                      src="/bus2.png"
                      alt="2호차"
                      className="w-8 h-8 object-contain"
                    />
                    <span className="text-sm">2호차</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 우측: 그리드 영역 (비율 1) - 지도와 완벽한 대칭을 이루는 라운드 카드 구조 */}
          <div className="relative min-h-0 overflow-hidden rounded-[24px] border border-gray-200 bg-white">
            <Grid
              rowData={gridRows}
              columnDefs={monitoringColumnDefs}
              gridRef={gridRef}
              gridOptions={{
                onRowClicked: ({ data }) => {
                  if (!data) return;
                  const vehicleId = String(data.vehicle_id ?? "");
                  const routeId = String(data.route_id || routeIdsRef.current[vehicleId] || "");
                  const location = vehicleCoordinates(data);
                  if (routeId) {
                    const key = `${routeId}|${vehicleId}`;
                    setRouteOptions(options => options.some(option => option.key === key) ? options : [
                      ...options, { key, routeId, vehicleId, name: String(data.route_nm || routeId) },
                    ]);
                    selectRoute(key, !location);
                  } else {
                    setRouteError("해당 차량의 운행 노선 정보가 없습니다.");
                  }
                  if (!location) return;
                  mapRef.current?.getView().animate({
                    center: fromLonLat(location),
                    duration: 450,
                  });
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onGridReady: (params: any) => {
                  params.api?.sizeColumnsToFit();
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onGridSizeChanged: (params: any) => {
                  params.api?.sizeColumnsToFit();
                },
              }}
              height="100%"
              enableNumberColoring={true}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
