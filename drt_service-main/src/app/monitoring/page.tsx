"use client";

import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { Map, View } from "@/lib/maps/kakaoMap";
import { defaults, FullScreen } from "@/lib/maps/kakaoMap";
import { fromLonLat } from "@/lib/maps/kakaoMap";
import { VectorLayer } from "@/lib/maps/kakaoMap";
import { VectorSource } from "@/lib/maps/kakaoMap";
import { Feature } from "@/lib/maps/kakaoMap";
import { Point } from "@/lib/maps/kakaoMap";
import { LineString } from "@/lib/maps/kakaoMap";
import { Style, Stroke, Icon } from "@/lib/maps/kakaoMap";
import { Overlay } from "@/lib/maps/kakaoMap";
import { getActiveRouteNodes, getVehicleMarkers, getBusArrivals } from "@/lib/api/monitoring";
import type { ActiveRouteNode, VehicleMarker } from "@/types/monitoring";
import { getStopList, type StopRow } from "@/lib/api/marker";
import { Button } from "@/components/ui/button";
import Grid from "@/components/Grid";
import type { ColDef } from "ag-grid-community";

const USIL_INTERSECTION_CENTER: [number, number] = [127.766968, 34.512524];
const SINGI_PORT_CENTER: [number, number] = [127.74364092364029, 34.59929482516387];
const GEUMODO_OVERVIEW_ZOOM = 15.5;
const FIXED_ROUTE_COLOR = "#667eea";
const RESERVED_ROUTE_COLOR = "#ffd400";
const VEHICLE_MOVE_DURATION_MS = 4500;

export default function MonitoringPage() {
  const mapRef = useRef<Map | null>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);
  const vehicleSourceRef = useRef<VectorSource | null>(null);
  const stopSourceRef = useRef<VectorSource | null>(null);
  const overlayRef = useRef<Overlay | null>(null);
  const stopsLoadedRef = useRef(false);
  const activeRouteSignatureRef = useRef("");
  const routeNamesRef = useRef<Record<string, string>>({});
  const gridRef = useRef(null);
  const [gridRows, setGridRows] = useState<Record<string, unknown>[]>([]);

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
    try {
      const response = await getActiveRouteNodes();
      const nodes = response.nodes || [];
      routeNamesRef.current = Object.fromEntries(nodes.map(node => [node.vehicle_id, node.route_nm ?? node.route_id]));
      const vectorSource = vectorSourceRef.current;
      if (!vectorSource) {
        console.warn("vectorSource is not ready");
        return;
      }

      const signature = nodes.map((node) =>
        `${node.route_id}:${node.vehicle_id}:${node.point_id}:${node.point_seq}:${node.ext_dispatch_div ?? ""}:${node.gps_x}:${node.gps_y}`
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
          .filter((node) => Number.isFinite(node.gps_x) && Number.isFinite(node.gps_y))
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
          const reserved = reservedFromPreviousStop[index] || reservedUntilNextStop[index + 1];
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
    } catch (error) {
      console.error("Failed to load active route nodes:", error);
    }
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

  // 버스 마커 데이터 로드 및 지도에 표시
  const loadVehicleMarkers = useCallback(async () => {
    try {
      const response = await getVehicleMarkers();
      const vehicles = response.vehicles || [];
      const vehicleSource = vehicleSourceRef.current;
      const map = mapRef.current;
      if (!vehicleSource || !map) {
        console.warn("vehicleSource or map is not ready");
        return;
      }

      // vehicle_id별로 그룹화하고 가장 최신값만 사용
      const latestVehicles = vehicles.reduce((acc, vehicle) => {
        const existing = acc[vehicle.vehicle_id];
        if (!existing || vehicle.oper_dtm > existing.oper_dtm) {
          acc[vehicle.vehicle_id] = vehicle;
        }
        return acc;
      }, {} as Record<string, VehicleMarker>);
      setGridRows(Object.values(latestVehicles).map(vehicle => ({ ...vehicle, route_nm: routeNamesRef.current[vehicle.vehicle_id] ?? "-" })));

      const existingFeatures = vehicleSource.getFeatures();
      const existingFeaturesById = Object.fromEntries(
        existingFeatures.map((feature) => [String(feature.get("vehicle_id")), feature])
      ) as Record<string, Feature>;
      const currentVehicleIds = new Set<string>();

      // 기존 마커는 제거하지 않고 위치와 방향만 갱신
      Object.values(latestVehicles).forEach((vehicle) => {
        currentVehicleIds.add(vehicle.vehicle_id);
        // 주의: 응답에서 gps_x가 위도, gps_y가 경도로 보이므로 순서 조정
        const coord = fromLonLat([vehicle.gps_y, vehicle.gps_x]);
        const feature = existingFeaturesById[vehicle.vehicle_id] ?? new Feature();
        const previousGeometry = feature.getGeometry();
        const previousCoord = previousGeometry instanceof Point
          ? previousGeometry.getCoordinates().slice()
          : null;
        const targetHeading = Number(vehicle.heading) || 0;
        const previousHeadingValue = Number(feature.get("display_heading"));
        const previousHeading = Number.isFinite(previousHeadingValue)
          ? previousHeadingValue
          : targetHeading;
        // 359° → 1° 같은 경우 반대 방향으로 한 바퀴 돌지 않도록 최단 각도를 사용한다.
        const headingDelta = ((targetHeading - previousHeading + 540) % 360) - 180;
        const iconSrc =
          vehicle.vehicle_id === "VH00000002" ? "/bus2.png" : "/bus.png";
        const vehicleIcon = new Icon({
          src: iconSrc,
          scale: 0.3,
          rotation: (previousHeading * Math.PI) / 180,
          anchor: [0.5, 0.5],
        });
        feature.setStyle(new Style({ image: vehicleIcon }));
        const previousAnimationFrame = feature.get("animation_frame") as number | undefined;
        if (previousAnimationFrame != null) cancelAnimationFrame(previousAnimationFrame);

        if (previousCoord) {
          const geometry = previousGeometry as Point;
          const startedAt = performance.now();
          const animate = (now: number) => {
            const progress = Math.min((now - startedAt) / VEHICLE_MOVE_DURATION_MS, 1);
            const eased = progress * progress * (3 - 2 * progress);
            geometry.setCoordinates([
              previousCoord[0] + (coord[0] - previousCoord[0]) * eased,
              previousCoord[1] + (coord[1] - previousCoord[1]) * eased,
            ]);
            const displayedHeading = (previousHeading + headingDelta * eased + 360) % 360;
            vehicleIcon.setRotation((displayedHeading * Math.PI) / 180);
            feature.set("display_heading", displayedHeading, true);
            if (progress < 1) {
              feature.set("animation_frame", requestAnimationFrame(animate), true);
            } else {
              feature.unset("animation_frame", true);
            }
          };
          feature.set("animation_frame", requestAnimationFrame(animate), true);
        } else {
          feature.setGeometry(new Point(coord));
          vehicleIcon.setRotation((targetHeading * Math.PI) / 180);
          feature.set("display_heading", targetHeading, true);
        }
        feature.setProperties({
          feature_kind: "vehicle",
          vehicle_id: vehicle.vehicle_id,
          vehicle_no: vehicle.vehicle_no,
          oper_dtm: vehicle.oper_dtm,
          heading: vehicle.heading,
          speed: vehicle.speed,
        });

        if (!existingFeaturesById[vehicle.vehicle_id]) vehicleSource.addFeature(feature);
      });

      existingFeatures.forEach((feature) => {
        const vehicleId = String(feature.get("vehicle_id"));
        if (!currentVehicleIds.has(vehicleId)) {
          const animationFrame = feature.get("animation_frame") as number | undefined;
          if (animationFrame != null) cancelAnimationFrame(animationFrame);
          vehicleSource.removeFeature(feature);
        }
      });
    } catch (error) {
      console.error("Failed to load vehicle markers:", error);
    }
  }, []);

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
          const speedKmh = speed * 3.6;
          tooltipElement.className = defaultTooltipClass;
          tooltipElement.innerHTML = `
            <div class="font-semibold">${vehicleNo}</div>
            <div>차량ID: ${vehicleId}</div>
            <div>속도: ${speedKmh.toFixed(2)} km/h</div>
            <div>방향: ${heading}°</div>
            <div>시간: ${dateStr}</div>
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
    vectorSourceRef.current = vectorSource;
    vehicleSourceRef.current = vehicleSource;
    stopSourceRef.current = stopSource;
    overlayRef.current = overlay;

    loadStops();

    // 버스 데이터 초기 로드 및 주기적 업데이트
    loadActiveRouteNodes();
    loadVehicleMarkers();
    const interval = setInterval(() => {
      loadActiveRouteNodes();
      loadVehicleMarkers();
    }, 5000);

    return () => {
      clearInterval(interval);
      vehicleSource.getFeatures().forEach((feature) => {
        const animationFrame = feature.get("animation_frame") as number | undefined;
        if (animationFrame != null) cancelAnimationFrame(animationFrame);
      });
      map.setTarget(undefined);
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
        <h1 className="text-[28px] font-bold tracking-tight">모니터링</h1>
        <p className="mt-1 text-sm text-gray-500">
          지도에서 버스 이동경로를 실시간으로 표출합니다.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
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
              <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 z-10">
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
