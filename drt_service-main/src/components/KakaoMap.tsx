"use client";

import { useEffect, useRef } from "react";
import { Map, View } from "@/lib/maps/kakaoMap";

interface KakaoMapProps {
  mapId: string;
  mapRef?: React.MutableRefObject<Map | null>;
  center?: [number, number];
  zoom?: number;
  className?: string;
}

export default function KakaoMap({
  mapId,
  mapRef,
  center = [127.748, 34.525],
  zoom = 17,
  className = "",
}: KakaoMapProps) {
  const initial = useRef({ center, zoom });
  useEffect(() => {
    const map = new Map({ target: mapId, view: new View(initial.current) });
    if (mapRef) mapRef.current = map;
    return () => {
      map.setTarget(undefined);
      if (mapRef) mapRef.current = null;
    };
  }, [mapId, mapRef]);
  return (
    <div
      className={`relative overflow-hidden rounded-[24px] border border-gray-200 ${className}`}
    >
      <div id={mapId} className="h-full w-full" />
    </div>
  );
}
