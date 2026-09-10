"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "ol/ol.css";
import Grid from "@/components/Grid";
import { getMarkerList, getStopList, type StopRow } from "@/lib/api/marker";
import { markerColumnDefs } from "@/features/marker/columnDefs";
import { stopSimpleColumnDefs } from "@/features/marker/stopColumnDefs";
import type { MarkerRow } from "@/types/marker";
import { Map, View } from "ol";
import { XYZ } from "ol/source";
import { Tile } from "ol/layer";
import { defaults } from "ol/control";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { Style, Icon, Circle as CircleStyle, Fill, Stroke } from "ol/style";
import { fromLonLat } from "ol/proj";
import Overlay from "ol/Overlay";
import { VWORLD_API_KEY } from "@/config/vworld";
import type { AgGridReact } from "ag-grid-react";
import type { RowClickedEvent } from "ag-grid-community";

export default function MarkerPage() {
  const gridRef = useRef<AgGridReact<Record<string, unknown>> | null>(null);
  const stopGridRef = useRef<AgGridReact<Record<string, unknown>> | null>(null);
  const mapRef = useRef<Map | null>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);
  const stopSourceRef = useRef<VectorSource | null>(null);

  const [allRows, setAllRows] = useState<MarkerRow[]>([]);
  const [stops, setStops] = useState<StopRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);

  // 마커 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [markerResponse, stopResponse] = await Promise.all([
          getMarkerList({}),
          getStopList(),
        ]);
        setAllRows(markerResponse.markers);
        setStops(stopResponse.stops);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 지도 초기화 및 벡터 레이어 추가
  useEffect(() => {
    const vectorSource = new VectorSource();
    const vectorLayer = new VectorLayer({
      source: vectorSource,
    });

    const stopSource = new VectorSource();
    const stopLayer = new VectorLayer({
      source: stopSource,
    });

    // 툴팁 오버레이 생성
    const tooltipElement = document.createElement("div");
    tooltipElement.className =
      "bg-black text-white text-xs rounded px-2 py-1 pointer-events-none whitespace-nowrap";
    tooltipElement.style.display = "none";
    document.body.appendChild(tooltipElement);

    const overlay = new Overlay({
      element: tooltipElement,
      positioning: "bottom-center",
      offset: [0, -10],
    });

    const map = new Map({
      controls: defaults({ zoom: true, rotate: false }).extend([]),
      layers: [
        new Tile({
          visible: true,
          source: new XYZ({
            url: `http://api.vworld.kr/req/wmts/1.0.0/${VWORLD_API_KEY}/Base/{z}/{y}/{x}.png`,
          }),
        }),
        vectorLayer,
        stopLayer,
      ],
      target: "marker-map",
      overlays: [overlay],
      view: new View({
        center: fromLonLat([127.730628, 34.527742]),
        zoom: 17,
      }),
    });

    // 마우스 호버 이벤트 처리
    let hoveredFeature: Feature | null = null;
    map.on("pointermove", (e) => {
      const feature = map.forEachFeatureAtPixel(
        e.pixel,
        (f) => f as Feature
      ) as Feature | null;

      if (feature) {
        // 마커 또는 정류장에 호버
        if (hoveredFeature !== feature) {
          hoveredFeature = feature;

          // 정류장인 경우
          if (feature.get("stn_id")) {
            const stnNm = feature.get("stn_nm");
            const stnId = feature.get("stn_id");
            const stnNo = feature.get("stn_no");
            const stnType = feature.get("stn_type");
            const remark = feature.get("remark");
            const gpsX = feature.get("gps_x");
            const gpsY = feature.get("gps_y");

            tooltipElement.innerHTML = `
              <div class="font-semibold">${stnNm || ""}</div>
              <div>정류장ID: ${stnId || ""}</div>
              <div>정류장번호: ${stnNo || ""}</div>
              <div>정류장형태: ${stnType || ""}</div>
              <div>비고: ${remark || ""}</div>
              <div>경도: ${gpsX ? Number(gpsX).toFixed(6) : ""}</div>
              <div>위도: ${gpsY ? Number(gpsY).toFixed(6) : ""}</div>
            `;
          } else {
            // 노드 마커인 경우
            const nodeId = feature.get("node_id");
            const nodeNm = feature.get("node_nm");
            const gpsX = feature.get("gps_x");
            const gpsY = feature.get("gps_y");

            tooltipElement.innerHTML = `
              <div class="font-semibold">${nodeNm || ""}</div>
              <div>노드ID: ${nodeId || ""}</div>
              <div>경도: ${gpsX ? Number(gpsX).toFixed(6) : ""}</div>
              <div>위도: ${gpsY ? Number(gpsY).toFixed(6) : ""}</div>
            `;
          }
          tooltipElement.style.display = "block";
          overlay.setPosition(e.coordinate);
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
    stopSourceRef.current = stopSource;

    return () => {
      map.setTarget(undefined);
      if (document.body.contains(tooltipElement)) {
        document.body.removeChild(tooltipElement);
      }
    };
  }, []); // 지도는 한 번만 초기화

  // 지도에 마커 표시 (초기 로드 시)
  useEffect(() => {
    const map = mapRef.current;
    const vectorSource = vectorSourceRef.current;
    const stopSource = stopSourceRef.current;

    if (!map || !vectorSource || !stopSource) return;

    // 기존 마커 제거
    vectorSource.clear();
    stopSource.clear();

    // 모든 마커 추가 (점으로 표시)
    allRows.forEach((marker) => {
      const coord = fromLonLat([marker.gps_x, marker.gps_y]);
      const feature = new Feature({
        geometry: new Point(coord),
        node_id: marker.node_id,
        node_nm: marker.node_nm,
        gps_x: marker.gps_x,
        gps_y: marker.gps_y,
      });

      // 기존 마커는 점으로 표시
      feature.setStyle(
        new Style({
          image: new CircleStyle({
            radius: 5,
            fill: new Fill({ color: "#007bff" }),
            stroke: new Stroke({ color: "#fff", width: 2 }),
          }),
        })
      );

      vectorSource.addFeature(feature);
    });

    // 정류장 데이터 추가 (busstop.png로 표시)
    stops.forEach((stop) => {
      const coord = fromLonLat([stop.gps_x, stop.gps_y]);
      const feature = new Feature({
        geometry: new Point(coord),
        stn_id: stop.stn_id,
        stn_nm: stop.stn_nm,
        stn_no: stop.stn_no,
        stn_type: stop.stn_type,
        remark: stop.remark,
        gps_x: stop.gps_x,
        gps_y: stop.gps_y,
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
  }, [allRows, stops]);

  // 선택된 마커 스타일 업데이트
  useEffect(() => {
    const vectorSource = vectorSourceRef.current;
    if (!vectorSource) return;

    // 모든 feature의 스타일 업데이트
    const features = vectorSource.getFeatures();
    features.forEach((feature) => {
      const nodeId = feature.get("node_id");
      const isSelected = selectedNodeId === nodeId;

      // 노드 마커만 선택 가능 (점)
      if (feature.get("node_id")) {
        feature.setStyle(
          new Style({
            image: new CircleStyle({
              radius: isSelected ? 8 : 5,
              fill: new Fill({ color: isSelected ? "#ff6b6b" : "#007bff" }),
              stroke: new Stroke({ color: "#fff", width: 2 }),
            }),
          })
        );
      }
    });
  }, [selectedNodeId]);

  // 선택된 정류장 스타일 업데이트
  useEffect(() => {
    const stopSource = stopSourceRef.current;
    if (!stopSource) return;

    // 모든 정류장 feature의 스타일 업데이트
    const features = stopSource.getFeatures();
    features.forEach((feature) => {
      const stnId = feature.get("stn_id");
      const isSelected = selectedStopId === stnId;

      // 정류장 마커 스타일 업데이트 (선택 시 크기 증가)
      if (feature.get("stn_id")) {
        feature.setStyle(
          new Style({
            image: new Icon({
              src: "/busstop.png",
              scale: isSelected ? 0.15 : 0.1,
              anchor: [0.5, 1],
            }),
          })
        );
      }
    });
  }, [selectedStopId]);

  // 그리드 행 클릭 시 지도 중심 이동 + 하이라이트
  const handleRowClicked = useCallback((event: RowClickedEvent<MarkerRow>) => {
    const row = event.data;
    if (!row) return;

    const map = mapRef.current;

    if (map && row.gps_x && row.gps_y) {
      // 선택된 노드 ID 설정
      setSelectedNodeId(row.node_id);
      // 정류장 선택 해제
      setSelectedStopId(null);

      // 그리드에서 해당 행 선택 (시각적 하이라이트)
      if (event.node) {
        event.node.setSelected(true);
      }

      // 정류장 그리드 선택 해제
      if (stopGridRef.current?.api) {
        stopGridRef.current.api.deselectAll();
      }

      // 지도 중심을 클릭한 마커로 이동
      const coord = fromLonLat([row.gps_x, row.gps_y]);
      map.getView().animate({
        center: coord,
        zoom: 18,
        duration: 500,
      });
    }
  }, []);

  // 정류장 그리드 행 클릭 시 지도 중심 이동 + 하이라이트
  const handleStopRowClicked = useCallback(
    (event: RowClickedEvent<StopRow>) => {
      const row = event.data;
      if (!row) return;

      const map = mapRef.current;

      if (map && row.gps_x && row.gps_y) {
        // 선택된 정류장 ID 설정
        setSelectedStopId(row.stn_id);
        // 마커 선택 해제
        setSelectedNodeId(null);

        // 그리드에서 해당 행 선택 (시각적 하이라이트)
        if (event.node) {
          event.node.setSelected(true);
        }

        // 마커 그리드 선택 해제
        if (gridRef.current?.api) {
          gridRef.current.api.deselectAll();
        }

        // 지도 중심을 클릭한 정류장으로 이동
        const coord = fromLonLat([row.gps_x, row.gps_y]);
        map.getView().animate({
          center: coord,
          zoom: 18,
          duration: 500,
        });
      }
    },
    []
  );

  const rowData = useMemo(() => {
    return allRows;
  }, [allRows]);

  const columnDefs = useMemo(() => markerColumnDefs, []);
  const stopColumnDefs = useMemo(() => stopSimpleColumnDefs, []);

  const gridOptions = useMemo(
    () => ({
      rowSelection: "single" as const,
      onRowClicked: handleRowClicked,
    }),
    [handleRowClicked]
  );

  const stopGridOptions = useMemo(
    () => ({
      rowSelection: "single" as const,
      onRowClicked: handleStopRowClicked,
    }),
    [handleStopRowClicked]
  );

  const stopRowData = useMemo(
    () => stops as unknown as Record<string, unknown>[],
    [stops]
  );

  return (
    <section
      className="rounded-xl border bg-white p-4"
      style={{
        width: "calc(100vw - 48px)",
        marginLeft: "calc(-50vw + 50% + 24px)",
        marginRight: "calc(-50vw + 50% + 24px)",
      }}>
      <div className="mb-4">
        <h1 className="text-xl font-semibold">마커관리</h1>
      </div>

      {/* 그리드와 지도를 1:3 비율로 배치 */}
      <div className="flex gap-4" style={{ height: "calc(100vh - 350px)" }}>
        {/* 그리드 영역 (1/4) - 상 2 하 1 비율로 분할 */}
        <div className="flex-1 flex flex-col gap-4">
          {/* 상단: 마커 그리드 (2/3) */}
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
                gridOptions={gridOptions}
                height={"100%"}
                enableNumberColoring={true}
              />
            )}
          </div>
          {/* 하단: 정류장 그리드 (1/3) */}
          <div className="flex-1 flex flex-col">
            <Grid
              rowData={stopRowData}
              columnDefs={stopColumnDefs}
              gridRef={stopGridRef}
              gridOptions={stopGridOptions}
              height={"100%"}
              enableNumberColoring={true}
            />
          </div>
        </div>

        {/* 지도 영역 (3/4) */}
        <div className="flex-[3]">
          <div
            id="marker-map"
            className="relative overflow-hidden rounded-[24px] border border-gray-200 h-full w-full"
          />
        </div>
      </div>
    </section>
  );
}
