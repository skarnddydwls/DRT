"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "ol/ol.css";
import { FilterForm } from "@/components/ui/FilterForm";
import Grid from "@/components/Grid";
import { getStopList } from "@/lib/api/stop";
import { stopColumnDefs } from "@/features/stop/columnDefs";
import { defaultFilters, stopFields } from "@/features/stop/fieldconfig";
import type { StopFilters, StopRow } from "@/types/stop";
import { Map, View } from "ol";
import { XYZ } from "ol/source";
import { Tile } from "ol/layer";
import { defaults } from "ol/control";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { Style, Icon } from "ol/style";
import { fromLonLat } from "ol/proj";
import Overlay from "ol/Overlay";
import { VWORLD_API_KEY } from "@/config/vworld";
import type { AgGridReact } from "ag-grid-react";
import type { RowClickedEvent } from "ag-grid-community";

export default function StopPage() {
  const gridRef = useRef<AgGridReact<Record<string, unknown>> | null>(null);
  const mapRef = useRef<Map | null>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);

  const [filters, setFilters] = useState<StopFilters>(defaultFilters);
  const [allRows, setAllRows] = useState<StopRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);

  useEffect(() => {
    const fetchStopList = async () => {
      setLoading(true);
      try {
        const response = await getStopList(filters);
        setAllRows(response.stops);
      } catch (error) {
        console.error("Failed to fetch stop list:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStopList();
  }, [filters]);

  const rowData = useMemo(() => {
    return allRows.filter((r) => {
      const matchStop = filters.stopName
        ? String(r["stn_nm"])?.includes(filters.stopName)
        : true;
      return matchStop;
    });
  }, [allRows, filters]);

  // 지도 초기화 및 벡터 레이어 추가
  useEffect(() => {
    const vectorSource = new VectorSource();
    const vectorLayer = new VectorLayer({
      source: vectorSource,
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
      ],
      target: "stop-map",
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
        if (hoveredFeature !== feature) {
          hoveredFeature = feature;

          const stnNm = feature.get("stn_nm");
          const gpsX = feature.get("gps_x");
          const gpsY = feature.get("gps_y");
          const direction = feature.get("direction");

          tooltipElement.innerHTML = `
            <div class="font-semibold">${stnNm || ""}</div>
            <div>방향: ${direction || ""}</div>
            <div>경도: ${gpsX ? Number(gpsX).toFixed(6) : ""}</div>
            <div>위도: ${gpsY ? Number(gpsY).toFixed(6) : ""}</div>
          `;
          tooltipElement.style.display = "block";
          overlay.setPosition(e.coordinate);
        }
      } else {
        if (hoveredFeature) {
          hoveredFeature = null;
          tooltipElement.style.display = "none";
          overlay.setPosition(undefined);
        }
      }
    });

    mapRef.current = map;
    vectorSourceRef.current = vectorSource;

    return () => {
      map.setTarget(undefined);
      if (document.body.contains(tooltipElement)) {
        document.body.removeChild(tooltipElement);
      }
    };
  }, []);

  // 지도에 정류장 마커 표시
  useEffect(() => {
    const map = mapRef.current;
    const vectorSource = vectorSourceRef.current;

    if (!map || !vectorSource) return;

    // 기존 마커 제거
    vectorSource.clear();

    // 모든 정류장 마커 추가
    rowData.forEach((stop) => {
      if (!stop.gps_x || !stop.gps_y) return;

      const coord = fromLonLat([stop.gps_x, stop.gps_y]);
      const feature = new Feature({
        geometry: new Point(coord),
        stn_id: stop.stn_id,
        stn_nm: stop.stn_nm,
        stn_no: stop.stn_no,
        stn_type: stop.stn_type,
        remark: stop.remark,
        direction: stop.direction,
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

      vectorSource.addFeature(feature);
    });
  }, [rowData]);

  // 선택된 정류장 스타일 업데이트
  useEffect(() => {
    const vectorSource = vectorSourceRef.current;
    if (!vectorSource) return;

    const features = vectorSource.getFeatures();
    features.forEach((feature) => {
      const stnId = feature.get("stn_id");
      const isSelected = selectedStopId === stnId;

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
  const handleRowClicked = useCallback((event: RowClickedEvent<StopRow>) => {
    const row = event.data;
    if (!row) return;

    const map = mapRef.current;

    if (map && row.gps_x && row.gps_y) {
      // 선택된 정류장 ID 설정
      setSelectedStopId(row.stn_id);

      // 그리드에서 해당 행 선택 (시각적 하이라이트)
      if (event.node) {
        event.node.setSelected(true);
      }

      // 지도 중심을 클릭한 정류장으로 이동
      const coord = fromLonLat([row.gps_x, row.gps_y]);
      map.getView().animate({
        center: coord,
        zoom: 18,
        duration: 500,
      });
    }
  }, []);

  const columnDefs = useMemo(() => stopColumnDefs, []);

  const gridOptions = useMemo(
    () => ({
      rowSelection: "single" as const,
      onRowClicked: handleRowClicked,
    }),
    [handleRowClicked]
  );

  return (
    <section className="rounded-xl border bg-white p-4">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">정류장관리</h1>
      </div>

      <FilterForm<StopFilters>
        fields={stopFields}
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
              gridOptions={gridOptions}
              height={"100%"}
              enableNumberColoring={true}
            />
          )}
        </div>

        {/* 지도 영역 (1/3) */}
        <div className="flex-1">
          <div
            id="stop-map"
            className="relative overflow-hidden rounded-[24px] border border-gray-200 h-full w-full"
          />
        </div>
      </div>
    </section>
  );
}
