/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import { KAKAO_MAP_KEY } from "@/config/kakao";

export type KakaoEditorNode = {
  id: string;
  pointId?: string;
  name: string;
  type: "STN" | "NODE";
  longitude: number;
  latitude: number;
};

const TARGET_CURSOR_SVG = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <path d="M16 2 C10.5 2 6 6.5 6 12 C6 18.5 14.2 26.5 15.3 27.6 C15.7 28 16.3 28 16.7 27.6 C17.8 26.5 26 18.5 26 12 C26 6.5 21.5 2 16 2 Z" fill="#4f46e5" stroke="#ffffff" stroke-width="2"/>
  <circle cx="16" cy="12" r="4.5" fill="#ffffff"/>
  <circle cx="16" cy="12" r="2.2" fill="#4f46e5"/>
  <circle cx="16" cy="29" r="1.5" fill="#ef4444" stroke="#ffffff" stroke-width="0.5"/>
</svg>
`.trim());

const CUSTOM_CURSOR = `url("data:image/svg+xml,${TARGET_CURSOR_SVG}") 16 29, crosshair`;

interface KakaoRouteEditorMapProps {
  nodes: KakaoEditorNode[];
  selectedNodeId?: string;
  fitRouteId?: string;
  onMapClick: (longitude: number, latitude: number) => void;
  cursorMode?: "STN" | "NODE" | null;
}

export default function KakaoRouteEditorMap({
  nodes,
  selectedNodeId,
  fitRouteId,
  onMapClick,
  cursorMode,
}: KakaoRouteEditorMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const clickHandlerRef = useRef(onMapClick);
  const lastFittedRouteIdRef = useRef("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(
    KAKAO_MAP_KEY ? "" : "NEXT_PUBLIC_KAKAO_MAP_KEY를 .env.local에 설정해 주세요."
  );

  useEffect(() => {
    clickHandlerRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    if (!ready || !mapRef.current || !containerRef.current) return;
    const map = mapRef.current;
    const container = containerRef.current;
    const observer = new ResizeObserver(() => map.relayout());
    observer.observe(container);
    requestAnimationFrame(() => map.relayout());
    return () => observer.disconnect();
  }, [ready]);

  useEffect(() => {
    if (!KAKAO_MAP_KEY) {
      return;
    }

    const initialize = () => {
      const kakao = (window as any).kakao;
      kakao.maps.load(() => {
        if (!containerRef.current || mapRef.current) return;
        const map = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(34.985, 126.12),
          level: 8,
        });
        map.addControl(new kakao.maps.MapTypeControl(), kakao.maps.ControlPosition.TOPLEFT);
        map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.LEFT);
        kakao.maps.event.addListener(map, "click", (event: any) => {
          clickHandlerRef.current(event.latLng.getLng(), event.latLng.getLat());
        });
        mapRef.current = map;
        setReady(true);
      });
    };

    if ((window as any).kakao?.maps) {
      initialize();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&autoload=false`;
    script.async = true;
    script.onload = initialize;
    script.onerror = () => setError("카카오맵 SDK를 불러오지 못했습니다. 키와 등록 도메인을 확인해 주세요.");
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const kakao = (window as any).kakao;
    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    overlaysRef.current = [];
    const drawableNodes = nodes.filter(
      (node) => Number.isFinite(node.longitude) && Number.isFinite(node.latitude)
    );
    if (!drawableNodes.length) return;
    mapRef.current.relayout();

    const path = drawableNodes.map((node) => new kakao.maps.LatLng(node.latitude, node.longitude));
    if (path.length > 1) {
      const polyline = new kakao.maps.Polyline({
        path,
        strokeWeight: 6,
        strokeColor: "#667ff5",
        strokeOpacity: 0.95,
        strokeStyle: "solid",
      });
      polyline.setMap(mapRef.current);
      overlaysRef.current.push(polyline);
    }

    drawableNodes.forEach((node, index) => {
      const color = node.type === "STN" ? "#35cf5a" : "#667ff5";
      const content = document.createElement("div");
      content.style.cssText = "display:flex;flex-direction:column;align-items:center;transform:translateY(-8px);pointer-events:none";
      const nameOverlay = node.type === "STN"
        ? `<span style="margin-top:4px;padding:2px 5px;border-radius:4px;background:#fffD;color:#222;font:600 12px sans-serif;white-space:nowrap">${node.name}</span>`
        : "";
      content.innerHTML = `<span style="display:flex;width:${node.type === "STN" ? 22 : 18}px;height:${node.type === "STN" ? 22 : 18}px;align-items:center;justify-content:center;border:3px solid white;border-radius:50%;background:${color};box-shadow:0 2px 6px #0004;color:white;font:700 10px sans-serif">${index + 1}</span>${nameOverlay}`;
      const overlay = new kakao.maps.CustomOverlay({
        position: path[index],
        content,
        yAnchor: 1,
        zIndex: node.type === "STN" ? 10 : 1,
      });
      overlay.setMap(mapRef.current);
      overlaysRef.current.push(overlay);
    });

    requestAnimationFrame(() => mapRef.current?.relayout());
  }, [nodes, ready]);

  useEffect(() => {
    if (
      !ready ||
      !mapRef.current ||
      !fitRouteId ||
      lastFittedRouteIdRef.current === fitRouteId
    ) return;
    const drawableNodes = nodes.filter(
      (node) => Number.isFinite(node.longitude) && Number.isFinite(node.latitude)
    );
    if (!drawableNodes.length) return;
    const kakao = (window as any).kakao;
    const bounds = new kakao.maps.LatLngBounds();
    drawableNodes.forEach((node) => {
      bounds.extend(new kakao.maps.LatLng(node.latitude, node.longitude));
    });
    mapRef.current.relayout();
    mapRef.current.setBounds(bounds, 70, 70, 70, 70);
    lastFittedRouteIdRef.current = fitRouteId;
  }, [fitRouteId, nodes, ready]);

  useEffect(() => {
    if (!ready || !mapRef.current || !selectedNodeId) return;
    const selectedNode = nodes.find((node) => node.id === selectedNodeId);
    if (
      !selectedNode ||
      !Number.isFinite(selectedNode.longitude) ||
      !Number.isFinite(selectedNode.latitude)
    ) return;
    const kakao = (window as any).kakao;
    mapRef.current.relayout();
    mapRef.current.panTo(
      new kakao.maps.LatLng(selectedNode.latitude, selectedNode.longitude)
    );
  }, [nodes, ready, selectedNodeId]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    try {
      if (cursorMode) {
        mapRef.current.setCursor(CUSTOM_CURSOR);
      } else {
        mapRef.current.setCursor("default");
      }
    } catch {
      // 카카오맵 커서 설정 실패 시 CSS fallback
    }
  }, [cursorMode, ready]);

  return (
    <>
      <div
        ref={containerRef}
        className={`h-full w-full ${cursorMode ? "map-add-mode" : ""}`}
        style={cursorMode ? { cursor: CUSTOM_CURSOR } : undefined}
      />
      {cursorMode && (
        <style>{`
          .map-add-mode,
          .map-add-mode * {
            cursor: ${CUSTOM_CURSOR} !important;
          }
        `}</style>
      )}
      {error && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-100 p-8 text-center">
          <div className="max-w-md rounded-xl border bg-white p-6 shadow-sm">
            <p className="font-semibold text-gray-900">카카오맵 설정이 필요합니다</p>
            <p className="mt-2 text-sm leading-6 text-gray-600">{error}</p>
          </div>
        </div>
      )}
    </>
  );
}
