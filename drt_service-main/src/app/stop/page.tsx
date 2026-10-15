"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FilterForm } from "@/components/ui/FilterForm";
import Grid from "@/components/Grid";
import { getStopList } from "@/lib/api/stop";
import { stopColumnDefs } from "@/features/stop/columnDefs";
import { defaultFilters, stopFields } from "@/features/stop/fieldconfig";
import type { StopFilters, StopRow } from "@/types/stop";
import { Map, View } from "@/lib/maps/kakaoMap";
import { defaults } from "@/lib/maps/kakaoMap";
import { VectorLayer } from "@/lib/maps/kakaoMap";
import { VectorSource } from "@/lib/maps/kakaoMap";
import { Feature } from "@/lib/maps/kakaoMap";
import { Point } from "@/lib/maps/kakaoMap";
import { Style, Icon } from "@/lib/maps/kakaoMap";
import { fromLonLat } from "@/lib/maps/kakaoMap";
import { Overlay } from "@/lib/maps/kakaoMap";
import type { AgGridReact } from "ag-grid-react";
import type { RowClickedEvent } from "ag-grid-community";

function showStopOverlay(overlay: Overlay, stop: StopRow | null) {
  const element = overlay.getElement();
  if (!element) return;
  const longitude = Number(stop?.gps_x);
  const latitude = Number(stop?.gps_y);
  if (!stop || !Number.isFinite(longitude) || !Number.isFinite(latitude) || !longitude || !latitude) {
    element.style.display = "none";
    overlay.setPosition(undefined);
    return;
  }
  element.replaceChildren();
  [stop.stn_nm || "", `방향: ${stop.direction || "-"}`,
    `경도: ${longitude.toFixed(6)}`, `위도: ${latitude.toFixed(6)}`].forEach((text, index) => {
    const line = document.createElement("div");
    line.textContent = text;
    if (index === 0) line.className = "font-semibold";
    element.appendChild(line);
  });
  element.style.display = "block";
  overlay.setPosition(fromLonLat([longitude, latitude]));
}

export default function StopPage() {
  const gridRef = useRef<AgGridReact<Record<string, unknown>> | null>(null);
  const mapRef = useRef<Map | null>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);
  const overlayRef = useRef<Overlay | null>(null);
  const selectedStopRef = useRef<StopRow | null>(null);

  const [filters, setFilters] = useState<StopFilters>(defaultFilters);
  const [allRows, setAllRows] = useState<StopRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);


  const fetchStopList = async (searchFilters: StopFilters = filters) => {
    setLoading(true);
    try {
      const response = await getStopList(searchFilters);
      setAllRows(response.stops);
    } catch (error) {
      console.error("Failed to fetch stop list:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStopList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = (newFilters: StopFilters) => {
    setFilters(newFilters);
  };

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
      // 선택 마커 높이(432px × 0.15 ≈ 65px) 위로 여백을 둔다.
      offset: [0, -75],
    });

    const map = new Map({
      controls: defaults({ zoom: true, rotate: false }).extend([]),
      layers: [
        vectorLayer,
      ],
      target: "stop-map",
      overlays: [overlay],
      view: new View({
        center: fromLonLat([127.766968, 34.512524]),
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

          showStopOverlay(overlay, feature.getProperties() as StopRow);
        }
      } else {
        if (hoveredFeature) {
          hoveredFeature = null;
          showStopOverlay(overlay, selectedStopRef.current);
        }
      }
    });

    mapRef.current = map;
    vectorSourceRef.current = vectorSource;
    overlayRef.current = overlay;
    const restoreSelectedOverlay = () => {
      hoveredFeature = null;
      showStopOverlay(overlay, selectedStopRef.current);
    };
    map.getViewport().addEventListener("pointerleave", restoreSelectedOverlay);

    return () => {
      map.getViewport().removeEventListener("pointerleave", restoreSelectedOverlay);
      overlayRef.current = null;
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
    const selected = rowData.find((stop) => stop.stn_id === selectedStopRef.current?.stn_id) ?? null;
    selectedStopRef.current = selected;
    if (overlayRef.current) showStopOverlay(overlayRef.current, selected);

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
  }, [selectedStopId, rowData]);

  // 그리드 행 클릭 시 지도 중심 이동 + 하이라이트
  const handleRowClicked = useCallback((event: RowClickedEvent<StopRow>) => {
    const row = event.data;
    if (!row) return;

    const map = mapRef.current;
    setSelectedStopId(row.stn_id);
    selectedStopRef.current = row;
    event.node?.setSelected(true);
    if (overlayRef.current) showStopOverlay(overlayRef.current, row);

    if (map && Number.isFinite(Number(row.gps_x)) && Number.isFinite(Number(row.gps_y)) && Number(row.gps_x) && Number(row.gps_y)) {
      // 선택된 정류장 ID 설정
      // 지도 중심을 클릭한 정류장으로 이동
      const coord = fromLonLat([Number(row.gps_x), Number(row.gps_y)]);
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
    <section>
      <div className="mb-6">
        <h1 className="text-[28px] font-bold tracking-tight">정류장관리</h1>
        <p className="mt-1 text-sm text-gray-500">정류장 정보를 조회하고 관리합니다.</p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <FilterForm<StopFilters>
          fields={stopFields}
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
              gridOptions={gridOptions}
              height={"100%"}
              enableNumberColoring={true}
            />
          </div>

          {/* 지도 영역 (1/3) */}
          <div className="flex-1">
            <div
              id="stop-map"
              className="relative overflow-hidden rounded-[24px] border border-gray-200 h-full w-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
