"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getRouteList } from "@/lib/api/route";
import { getRouteNodesForEdit, saveRouteNodes } from "@/lib/api/routeEdit";
import { getStopList, type StopRow } from "@/lib/api/marker";
import KakaoRouteEditorMap, { type KakaoEditorNode } from "@/components/KakaoRouteEditorMap";
import type { RouteRow } from "@/types/route";
import { MapPin, Crosshair } from "lucide-react";

type EditorNode = KakaoEditorNode;

const sampleRoutes: RouteRow[] = [
  { route_id: "sample-365", route_nm: "365-1(1)", o_stn_nm: "두포마을분무골", d_stn_nm: "우학터미널" },
];

const sampleNodes: EditorNode[] = [
  { id: "sample-1", name: "두포마을분무골", type: "STN", longitude: 126.095, latitude: 34.995 },
  { id: "sample-2", name: "두포마을", type: "NODE", longitude: 126.102, latitude: 34.993 },
  { id: "sample-3", name: "두모초등학교", type: "STN", longitude: 126.124, latitude: 34.988 },
  { id: "sample-4", name: "두모", type: "STN", longitude: 126.139, latitude: 34.978 },
  { id: "sample-5", name: "우학터미널", type: "NODE", longitude: 126.151, latitude: 34.958 },
];

export default function RouteEditPage() {
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [nodes, setNodes] = useState<EditorNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [addMode, setAddMode] = useState<"STN" | "NODE" | null>(null);
  const [message, setMessage] = useState("노선을 선택한 뒤 지도에서 편집하세요.");
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [stops, setStops] = useState<StopRow[]>([]);
  const [stopQuery, setStopQuery] = useState("");
  const [selectedStopId, setSelectedStopId] = useState("");
  const [stopsLoading, setStopsLoading] = useState(false);
  const [savedNodesSnapshot, setSavedNodesSnapshot] = useState("[]");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<RouteRow | null>(null);
  const [saving, setSaving] = useState(false);

  const visibleRoutes = useMemo(
    () => routes.filter((route) => String(route.route_nm ?? "").includes(query.trim())),
    [query, routes]
  );
  const visibleStops = useMemo(() => {
    const keyword = stopQuery.trim();
    if (!keyword) return stops;
    return stops.filter((stop) =>
      `${stop.stn_nm ?? ""} ${stop.stn_id ?? ""} ${stop.stn_no ?? ""}`.includes(keyword)
    );
  }, [stopQuery, stops]);
  const isDirty = Boolean(selectedRouteId) && JSON.stringify(nodes) !== savedNodesSnapshot;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && addMode) {
        setAddMode(null);
        setMessage("지점 추가 모드를 종료했습니다.");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [addMode]);

  const handleMapClick = useCallback((longitude: number, latitude: number) => {
    if (!addMode) return;
    const nextNumber = nodes.length + 1;
    const newNode: EditorNode = {
      id: `draft-${Date.now()}`,
      name: addMode === "STN" ? `새 정류장 ${nextNumber}` : `노드 ${nextNumber}`,
      type: addMode,
      longitude,
      latitude,
    };
    setNodes((current) => {
      const selectedIndex = current.findIndex(
        (node) => node.id === selectedNodeId
      );
      if (selectedIndex < 0) return [...current, newNode];
      return [
        ...current.slice(0, selectedIndex + 1),
        newNode,
        ...current.slice(selectedIndex + 1),
      ];
    });
    setSelectedNodeId(newNode.id);
    setMessage(`${addMode === "STN" ? "정류장" : "지점"}을 추가했습니다.`);
  }, [addMode, nodes.length, selectedNodeId]);

  const loadRoute = useCallback(async (route: RouteRow) => {
    const routeId = String(route.route_id);
    setSelectedRouteId(routeId);
    setSelectedNodeId("");
    setLoading(true);
    try {
      const response = await getRouteNodesForEdit({ ROUTE_ID: routeId });
      const routeNodes = response.nodes
        .filter((node) => String(node.route_id) === routeId)
        .sort((a, b) => a.point_seq - b.point_seq)
        .map((node, index) => ({
          id: `${node.point_id}-${node.point_seq}-${index}`,
          pointId: String(node.point_id),
          name: String((node as unknown as Record<string, unknown>).point_nm ?? node.point_id),
          type: node.point_type,
          longitude: Number(node.gps_x),
          latitude: Number(node.gps_y),
        }));
      const validRouteNodes = routeNodes.filter(
        (node) => Number.isFinite(node.longitude) && Number.isFinite(node.latitude)
      );
      const missingCoordinateCount = routeNodes.length - validRouteNodes.length;
      const loadedNodes = validRouteNodes.length ? validRouteNodes : sampleNodes;
      setNodes(loadedNodes);
      setSavedNodesSnapshot(JSON.stringify(loadedNodes));
      if (loadedNodes.length > 0) {
        setSelectedNodeId(loadedNodes[loadedNodes.length - 1].id);
      }
      setMessage(
        validRouteNodes.length
          ? `노선 [${route.route_nm ?? routeId}] 노드 ${validRouteNodes.length}개를 불러왔습니다.${missingCoordinateCount ? ` 좌표 없는 ${missingCoordinateCount}개는 제외했습니다.` : ""}`
          : `[${route.route_nm ?? routeId}] 좌표가 등록된 노드가 없어 예시 경로를 표시합니다.`
      );
    } catch {
      setNodes(sampleNodes);
      setSavedNodesSnapshot(JSON.stringify(sampleNodes));
      if (sampleNodes.length > 0) {
        setSelectedNodeId(sampleNodes[sampleNodes.length - 1].id);
      }
      setMessage(`[${route.route_nm ?? routeId}] 백엔드가 연결되지 않아 예시 경로를 표시합니다.`);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const response = await getRouteList({ routeName: query.trim() });
      const loadedRoutes = response.routes?.length ? response.routes : sampleRoutes;
      setRoutes(loadedRoutes);
      setSelectedRouteId("");
      setNodes([]);
      setMessage(
        loadedRoutes.length
          ? `노선 ${loadedRoutes.length}건이 조회되었습니다. 편집할 노선을 선택하세요.`
          : "조회된 노선이 없습니다."
      );
    } catch {
      setRoutes(sampleRoutes);
      setSelectedRouteId("");
      setNodes([]);
      setMessage("백엔드가 연결되지 않아 예시 노선을 표시합니다. 편집할 노선을 선택하세요.");
    } finally {
      setLoading(false);
    }
  };

  const requestRouteSelection = (route: RouteRow) => {
    if (String(route.route_id) === selectedRouteId) return;
    if (isDirty) {
      setPendingRoute(route);
      return;
    }
    void loadRoute(route);
  };

  const moveNode = (direction: -1 | 1) => {
    const index = nodes.findIndex((node) => node.id === selectedNodeId);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= nodes.length) return;
    const copy = [...nodes];
    [copy[index], copy[next]] = [copy[next], copy[index]];
    setNodes(copy);
  };

  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;
    setNodes((current) => {
      const remaining = current.filter((node) => node.id !== selectedNodeId);
      if (remaining.length > 0) {
        setSelectedNodeId(remaining[remaining.length - 1].id);
      } else {
        setSelectedNodeId("");
      }
      return remaining;
    });
    setMessage("선택한 지점을 삭제했습니다.");
  };

  const openStopDialog = async () => {
    setAddMode(null);
    setStopDialogOpen(true);
    setSelectedStopId("");
    if (stops.length) return;
    setStopsLoading(true);
    try {
      const response = await getStopList();
      setStops(response.stops ?? []);
    } catch {
      setMessage("정류장 목록을 불러오지 못했습니다.");
    } finally {
      setStopsLoading(false);
    }
  };

  const addSelectedStop = () => {
    const stop = stops.find((item) => String(item.stn_id) === selectedStopId);
    if (!stop) return;
    const longitude = Number(stop.gps_x);
    const latitude = Number(stop.gps_y);
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      setMessage("선택한 정류장에 유효한 좌표가 없습니다.");
      return;
    }
    const newNode: EditorNode = {
      id: `${stop.stn_id}-draft-${Date.now()}`,
      pointId: String(stop.stn_id),
      name: String(stop.stn_nm ?? stop.stn_id),
      type: "STN",
      longitude,
      latitude,
    };
    setNodes((current) => [...current, newNode]);
    setSelectedNodeId(newNode.id);
    setStopDialogOpen(false);
    setMessage(`${newNode.name} 정류장을 노드구성에 추가했습니다.`);
  };

  const saveCurrentNodes = async () => {
    if (!selectedRouteId) {
      setMessage("먼저 노선을 선택해 주세요.");
      return false;
    }
    setSaving(true);
    try {
      await saveRouteNodes({
        ROUTE_ID: selectedRouteId,
        NODE_LIST: nodes.map((node, index) => ({
          POINT_ID: node.pointId ?? null,
          POINT_NM: node.name,
          POINT_SEQ: index + 1,
          POINT_TYPE: node.type,
          REQUIRED_MIN: 0,
          GPS_X: node.longitude,
          GPS_Y: node.latitude,
        })),
      });
      setSavedNodesSnapshot(JSON.stringify(nodes));
      setMessage(`노드구성 ${nodes.length}개를 저장했습니다.`);
      return true;
    } catch {
      setMessage("노드구성 저장에 실패했습니다. 백엔드 저장 API를 확인해 주세요.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">노선편집</h1>
          <p className="mt-1 text-sm text-gray-500">노선을 선택하고 지도 위에 정류장과 경유 지점을 배치합니다.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{message}</span>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-4 rounded-xl border border-[#D9D9D9] bg-[#E9E9E9] p-4 px-6">
          <label htmlFor="route-query" className="shrink-0 text-sm font-medium text-gray-700">노선명</label>
          <input
            id="route-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleSearch();
            }}
            placeholder="노선명을 입력하세요"
            className="h-9 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-gray-600"
          />
          <button
            type="button"
            onClick={handleSearch}
            className="h-9 rounded-lg bg-[#242424] px-6 text-sm font-semibold text-white hover:bg-black transition-colors"
          >
            조회
          </button>
          <button
            type="button"
            onClick={() => selectedRouteId ? setSaveDialogOpen(true) : setMessage("먼저 노선을 선택해 주세요.")}
            disabled={!selectedRouteId || saving}
            className="h-9 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 transition-colors"
          >
            저장
          </button>
        </div>

        <div className="relative grid grid-cols-[38%_1fr] gap-6 min-h-0 max-h-[calc(100vh-400px)]" style={{ height: "calc(100vh - 400px)" }}>
          {loading && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-xl bg-white/75 backdrop-blur-[1px]">
              <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              <p className="text-sm font-semibold text-gray-700">데이터를 불러오는 중...</p>
            </div>
          )}

          <div className="flex min-w-0 min-h-0 flex-col gap-4 h-full overflow-hidden">
            <div className="flex flex-col h-[40%] min-h-0 shrink-0">
              <h2 className="mb-2 shrink-0 font-semibold">노선관리</h2>
              <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-gray-300 bg-white">
                <table className="w-full table-fixed text-center text-sm">
                  <thead className="sticky top-0 z-[2] bg-gray-100 shadow-sm">
                    <tr>
                      <th className="p-3 bg-gray-100">노선명</th>
                      <th className="bg-gray-100">기점</th>
                      <th className="bg-gray-100">종점</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRoutes.length === 0 ? (
                      <tr><td colSpan={3} className="py-8 text-center text-xs text-gray-400">조회된 노선이 없습니다.</td></tr>
                    ) : (
                      visibleRoutes.map((route, index) => {
                        const id = String(route.route_id ?? route.line_id ?? route.route_nm ?? index);
                        return (
                          <tr
                            key={id}
                            onClick={() => requestRouteSelection(route)}
                            className={`cursor-pointer border-t hover:bg-green-50 ${selectedRouteId === id ? "bg-green-50 font-semibold text-green-700" : ""}`}
                          >
                            <td className="p-3 truncate">{String(route.route_nm ?? "-")}</td>
                            <td className="truncate">{String(route.o_stn_nm ?? "-")}</td>
                            <td className="truncate">{String(route.d_stn_nm ?? "-")}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
              <div className="mb-2 flex shrink-0 items-center justify-between">
                <h2 className="font-semibold">노드구성</h2>
                <div className="flex gap-2">
                  <button type="button" onClick={() => moveNode(-1)} className="rounded border px-2.5 py-0.5 text-xs hover:bg-gray-50">위로</button>
                  <button type="button" onClick={() => moveNode(1)} className="rounded border px-2.5 py-0.5 text-xs hover:bg-gray-50">아래로</button>
                  <button
                    type="button"
                    onClick={deleteSelectedNode}
                    disabled={!selectedNodeId || nodes.length === 0}
                    className="rounded border border-red-300 px-2.5 py-0.5 text-xs text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300 disabled:hover:bg-transparent"
                  >
                    삭제
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-gray-300 bg-white">
                <table className="w-full table-fixed text-center text-sm">
                  <thead className="sticky top-0 z-[2] bg-gray-100 shadow-sm">
                    <tr>
                      <th className="p-3 w-16 bg-gray-100">순번</th>
                      <th className="w-24 bg-gray-100">타입</th>
                      <th className="bg-gray-100">노드명</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nodes.length === 0 ? (
                      <tr><td colSpan={3} className="py-8 text-center text-xs text-gray-400">등록된 노드가 없습니다.</td></tr>
                    ) : (
                      nodes.map((node, index) => (
                        <tr
                          key={node.id}
                          ref={(element) => { if (element && selectedNodeId === node.id) element.scrollIntoView({ block: "nearest" }); }}
                          onClick={() => setSelectedNodeId(node.id)}
                          className={`cursor-pointer border-t hover:bg-blue-50 ${selectedNodeId === node.id ? "bg-blue-50" : ""}`}
                        >
                          <td className="p-3">{index + 1}</td>
                          <td>{node.type === "STN" ? "정류장" : "지점"}</td>
                          <td>
                            <input
                              aria-label="노드명"
                              className="w-full bg-transparent text-center outline-none"
                              value={node.name}
                              onChange={(event) => setNodes((current) => current.map((item) => item.id === node.id ? { ...item, name: event.target.value } : item))}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div
            className={`relative h-full min-h-0 overflow-hidden rounded-xl transition-all duration-300 ${addMode === "NODE"
              ? "border-2 border-blue-500 ring-2 ring-blue-500/20"
              : "border border-gray-300 bg-gray-100"
              }`}
          >
            <KakaoRouteEditorMap
              nodes={nodes}
              selectedNodeId={selectedNodeId}
              fitRouteId={selectedRouteId}
              onMapClick={handleMapClick}
              cursorMode={addMode}
            />

            {/* 우상단 모던 플로팅 툴바: 정류장 추가 / 지점 추가 */}
            <div className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-2xl border border-white/60 bg-white/85 p-1.5 shadow-xl shadow-slate-900/5 backdrop-blur-md ring-1 ring-black/5">
              {/* 1. 정류장 추가 버튼 */}
              <button
                type="button"
                onClick={openStopDialog}
                className="group flex h-9 min-w-[106px] items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 text-xs font-semibold text-slate-700 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50/60 hover:text-emerald-700 active:translate-y-0 active:bg-slate-100"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 transition-colors group-hover:bg-emerald-200">
                  <MapPin className="h-3.5 w-3.5" />
                </div>
                <span>정류장 추가</span>
              </button>

              {/* 디바이더 */}
              <div className="h-4 w-px bg-slate-200" />

              {/* 2. 지점 추가 버튼 (클릭 모드 토글) */}
              <button
                type="button"
                onClick={() => {
                  const next = addMode === "NODE" ? null : "NODE";
                  setAddMode(next);
                  setMessage(
                    next
                      ? "지점 추가 모드: 지도에서 추가할 위치를 클릭하세요."
                      : "지점 추가 모드를 종료했습니다."
                  );
                }}
                className={`group relative flex h-9 min-w-[106px] items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold transition-all duration-200 ${addMode === "NODE"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/50 hover:brightness-105"
                  : "border border-slate-200/80 bg-white text-slate-700 shadow-xs hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/60 hover:text-blue-700 active:translate-y-0"
                  }`}
              >
                {addMode === "NODE" ? (
                  <>
                    <Crosshair className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: "6s" }} />
                    <span>추가 종료</span>
                  </>
                ) : (
                  <>
                    <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-blue-100 text-blue-600 transition-colors group-hover:bg-blue-200">
                      <Crosshair className="h-3.5 w-3.5" />
                    </div>
                    <span>지점 추가</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {stopDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setStopDialogOpen(false);
          }}>
          <div role="dialog" aria-modal="true" aria-labelledby="stop-dialog-title" className="flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-5">
              <div>
                <h2 id="stop-dialog-title" className="text-xl font-bold">정류장 선택</h2>
                <p className="mt-1 text-sm text-gray-500">노드구성에 추가할 정류장을 선택하세요.</p>
              </div>
              <button onClick={() => setStopDialogOpen(false)} aria-label="팝업 닫기" className="rounded-lg px-3 py-2 text-xl text-gray-500 hover:bg-gray-100">×</button>
            </div>

            <div className="border-b p-4">
              <input
                autoFocus
                value={stopQuery}
                onChange={(event) => setStopQuery(event.target.value)}
                placeholder="정류장명, 정류장 ID 또는 번호 검색"
                className="h-11 w-full rounded-lg border border-gray-300 px-4 outline-none focus:border-green-500"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="sticky top-0 bg-gray-100 text-gray-700">
                  <tr>
                    <th className="w-40 py-3 pl-6 pr-3">정류장ID</th>
                    <th className="w-32 p-3">정류장번호</th>
                    <th className="p-3">정류장명</th>
                    <th className="w-32 py-3 pl-3 pr-6">방향</th>
                  </tr>
                </thead>
                <tbody>
                  {stopsLoading ? (
                    <tr><td colSpan={4} className="p-10 text-center text-gray-500">정류장 목록을 불러오는 중...</td></tr>
                  ) : visibleStops.length ? (
                    visibleStops.map((stop, index) => {
                      const stopId = String(stop.stn_id);
                      const selected = selectedStopId === stopId;
                      return (
                        <tr
                          key={`${stopId}-${index}`}
                          onClick={() => setSelectedStopId(stopId)}
                          onDoubleClick={() => {
                            setSelectedStopId(stopId);
                          }}
                          className={`cursor-pointer border-t hover:bg-green-50 ${selected ? "bg-green-50 font-semibold text-green-700" : ""}`}>
                          <td className="py-3 pl-6 pr-3">{stopId}</td>
                          <td className="p-3">{stop.stn_no || "-"}</td>
                          <td className="p-3">{stop.stn_nm || "-"}</td>
                          <td className="py-3 pl-3 pr-6">{stop.direction || "-"}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan={4} className="p-10 text-center text-gray-500">검색 결과가 없습니다.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <button onClick={() => setStopDialogOpen(false)} className="rounded-lg border px-5 py-2.5 font-semibold text-gray-700">취소</button>
              <button onClick={addSelectedStop} disabled={!selectedStopId} className="rounded-lg bg-green-600 px-5 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300">확인</button>
            </div>
          </div>
        </div>
      )}

      {saveDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-6">
          <div role="dialog" aria-modal="true" aria-labelledby="save-dialog-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="save-dialog-title" className="text-xl font-bold">노드구성 저장</h2>
            <p className="mt-3 text-gray-600">현재 노드구성을 저장하시겠습니까?</p>
            <p className="mt-2 text-sm text-gray-500">총 {nodes.length}개의 노드가 순서대로 저장됩니다.</p>
            <div className="mt-7 flex justify-end gap-3">
              <button onClick={() => setSaveDialogOpen(false)} disabled={saving} className="rounded-lg border px-5 py-2.5 font-semibold text-gray-700">취소</button>
              <button onClick={async () => { if (await saveCurrentNodes()) setSaveDialogOpen(false); }} disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white disabled:bg-blue-300">{saving ? "저장 중..." : "확인"}</button>
            </div>
          </div>
        </div>
      )}

      {pendingRoute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-6">
          <div role="dialog" aria-modal="true" aria-labelledby="route-change-dialog-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="route-change-dialog-title" className="text-xl font-bold">변경사항이 있습니다</h2>
            <p className="mt-3 leading-6 text-gray-600">현재 변경한 노드구성을 저장한 후 다른 노선으로 이동하시겠습니까?</p>
            <div className="mt-7 flex flex-wrap justify-end gap-3">
              <button onClick={() => setPendingRoute(null)} disabled={saving} className="rounded-lg border px-4 py-2.5 font-semibold text-gray-700">계속 편집</button>
              <button onClick={() => { const route = pendingRoute; setPendingRoute(null); void loadRoute(route); }} disabled={saving} className="rounded-lg border border-red-300 px-4 py-2.5 font-semibold text-red-600">저장 안 함</button>
              <button onClick={async () => { const route = pendingRoute; if (await saveCurrentNodes()) { setPendingRoute(null); await loadRoute(route); } }} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white disabled:bg-blue-300">{saving ? "저장 중..." : "저장 후 이동"}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
