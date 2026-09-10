"use client";

import { useEffect, useRef } from "react";
import "ol/ol.css";
import { Map, View } from "ol";
import { XYZ } from "ol/source";
import { Tile } from "ol/layer";
import { defaults } from "ol/control";
import { fromLonLat } from "ol/proj";
import { VWORLD_API_KEY } from "@/config/vworld";

interface VWorldMapProps {
  /** 지도 컨테이너의 고유 ID */
  mapId: string;
  /** 지도 인스턴스를 외부에서 참조할 수 있도록 하는 ref */
  mapRef?: React.MutableRefObject<Map | null>;
  /** 초기 중심 좌표 [경도, 위도] */
  center?: [number, number];
  /** 초기 줌 레벨 (기본값: 11) */
  zoom?: number;
  /** VWorld API 키 (기본값: 프로젝트에서 사용 중인 키) */
  apiKey?: string;
  /** 지도 컨테이너 클래스명 */
  className?: string;
}

/**
 * VWorld API를 사용하는 OpenLayers 지도 컴포넌트
 */

export default function VWorldMap({
  mapId,
  mapRef,
  center = [126.94917737, 37.3745533],
  zoom = 17,
  apiKey = VWORLD_API_KEY,
  className = "",
}: VWorldMapProps) {
  const internalMapRef = useRef<Map | null>(null);

  useEffect(() => {
    const map = new Map({
      controls: defaults({ zoom: true, rotate: false }).extend([]),
      layers: [
        new Tile({
          visible: true,
          source: new XYZ({
            url: `http://api.vworld.kr/req/wmts/1.0.0/${apiKey}/Base/{z}/{y}/{x}.png`,
          }),
        }),
      ],
      target: mapId,
      view: new View({
        center: fromLonLat(center),
        zoom,
      }),
    });

    internalMapRef.current = map;
    if (mapRef) {
      mapRef.current = map;
    }

    return () => {
      map.setTarget(undefined);
    };
  }, [mapId, mapRef, center, zoom, apiKey]);

  return (
    <div
      className={`relative overflow-hidden rounded-[24px] border border-gray-200 ${className}`}>
      <div id={mapId} className="h-full w-full" />
    </div>
  );
}
