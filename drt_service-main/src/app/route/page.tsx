"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FilterForm } from "@/components/ui/FilterForm";
import Grid from "@/components/Grid";
import { getRouteList, manageRoute, type RouteCreatePayload } from "@/lib/api/route";
import { getStopList, type StopRow } from "@/lib/api/marker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { routeColumnDefs } from "@/features/route/columnDefs";
import { defaultFilters, routeFields } from "@/features/route/fieldconfig";
import type { RouteFilters, RouteRow } from "@/types/route";

export default function RoutePage() {
  const gridRef = useRef(null);

  const [filters, setFilters] = useState<RouteFilters>(defaultFilters);
  const [allRows, setAllRows] = useState<RouteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<RouteRow | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [stops, setStops] = useState<StopRow[]>([]);
  const [stopsLoading, setStopsLoading] = useState(false);
  const [form, setForm] = useState<RouteCreatePayload>({ ROUTE_NM: "", O_STN_ID: "", D_STN_ID: "", START_DT: "", END_DT: "9999-12-31", USE_YN: "Y", REMARK: "" });

  const fetchRouteList = async (searchFilters: RouteFilters = filters) => {
    setLoading(true);
    try {
      const response = await getRouteList(searchFilters);
      setAllRows(response.routes);
    } catch (error) {
      console.error("Failed to fetch route list:", error);
      setMessage("노선 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRouteList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!addOpen) return;
    let active = true;
    setStopsLoading(true);
    getStopList().then((data) => { if (active) setStops(data.stops); })
      .catch(() => { if (active) setDialogError("정류장을 불러오지 못했습니다. 팝업을 다시 열어주세요."); })
      .finally(() => { if (active) setStopsLoading(false); });
    return () => { active = false; };
  }, [addOpen]);

  const openAdd = () => {
    setDialogError("");
    setForm({ ROUTE_NM: "", O_STN_ID: "", D_STN_ID: "", START_DT: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10), END_DT: "9999-12-31", USE_YN: "Y", REMARK: "" });
    setAddOpen(true);
  };

  const addRoute = async () => {
    if (saving) return;
    if (!form.ROUTE_NM.trim() || !form.START_DT || !form.END_DT) {
      setDialogError("노선명과 적용 시작일·종료일을 입력해주세요."); return;
    }
    if (form.END_DT < form.START_DT) { setDialogError("종료일은 시작일 이후여야 합니다."); return; }
    setSaving(true); setDialogError("");
    try {
      const result = await manageRoute({ action: "insert", ...form });
      setAddOpen(false);
      setSelectedRoute(null);
      setMessage(`노선을 추가했습니다. (${result.route_id}) 노선편집에서 정류장과 지점을 구성해주세요.`);
      await fetchRouteList();
    } catch (error) { setDialogError(error instanceof Error ? error.message : "노선 추가에 실패했습니다."); }
    finally { setSaving(false); }
  };

  const deleteRoute = async () => {
    if (!selectedRoute || saving) return;
    setSaving(true); setDialogError("");
    try {
      await manageRoute({ action: "delete", ROUTE_ID: String(selectedRoute.route_id) });
      setDeleteOpen(false); setSelectedRoute(null);
      setMessage("노선을 삭제했습니다.");
      await fetchRouteList();
    } catch (error) { setDialogError(error instanceof Error ? error.message : "노선 삭제에 실패했습니다."); }
    finally { setSaving(false); }
  };

  const handleSearch = (searchFilters: RouteFilters = filters) => {
    setFilters(searchFilters);
  };

  const rowData = useMemo(() => {
    return allRows.filter((r) => {
      const matchRoute = filters.routeName
        ? String(r["route_nm"])?.includes(filters.routeName)
        : true;
      return matchRoute;
    });
  }, [allRows, filters]);

  const columnDefs = useMemo(() => routeColumnDefs, []);

  return (
    <section>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
        <h1 className="text-[28px] font-bold tracking-tight">노선관리</h1>
        <p className="mt-1 text-sm text-gray-500">노선 정보를 조회하고 관리합니다.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openAdd} disabled={saving || loading} className="bg-blue-600 text-white hover:bg-blue-700">추가</Button>
          <Button onClick={() => { setDialogError(""); setDeleteOpen(true); }} disabled={!selectedRoute || saving || loading} className="bg-red-600 text-white hover:bg-red-700">삭제</Button>
        </div>
      </div>
      {message && <p role="status" className="mb-4 rounded-lg border bg-slate-50 p-3 text-sm">{message}</p>}

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <FilterForm<RouteFilters>
          fields={routeFields}
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
              gridOptions={{
                rowSelection: "single",
                suppressRowClickSelection: false,
                getRowId: (params) => String(params.data.route_id),
                onRowClicked: (event) => { if (event.data) setSelectedRoute(event.data); },
                getRowStyle: (params) => params.data?.route_id === selectedRoute?.route_id ? { backgroundColor: "#e3f2fd" } : undefined,
              }}
              height={"100%"}
              enableNumberColoring={true}
            />
          </div>

          {/* 지도 영역 (1/3) */}
          {/* <div className="flex-1">
            <KakaoMap mapId="route-map" className="h-full" />
          </div> */}
        </div>
      </div>
      <Dialog open={addOpen} onOpenChange={(open) => { if (!saving) setAddOpen(open); }}>
        <DialogContent showCloseButton={!saving} className="w-[560px] max-w-[calc(100vw-32px)] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>노선 추가</DialogTitle><DialogDescription>노선ID는 자동 발급됩니다. 노선구성은 등록 후 노선편집에서 추가하세요.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <label className="col-span-2 space-y-2 text-sm font-semibold">노선명 *<Input autoFocus value={form.ROUTE_NM} maxLength={30} disabled={saving} onChange={(e) => setForm({ ...form, ROUTE_NM: e.target.value })} /></label>
            {(["O_STN_ID", "D_STN_ID"] as const).map((field) => <label key={field} className="space-y-2 text-sm font-semibold">{field === "O_STN_ID" ? "기점" : "종점"}
              <select value={form[field]} disabled={saving || stopsLoading} onChange={(e) => setForm({ ...form, [field]: e.target.value })} className="h-9 w-full rounded-md border bg-white px-2 text-sm font-normal">
                <option value="">{stopsLoading ? "불러오는 중..." : "미지정"}</option>
                {stops.map((stop) => <option key={stop.stn_id} value={stop.stn_id}>{stop.stn_nm}{stop.direction ? ` (${stop.direction})` : ""} · {stop.stn_id}</option>)}
              </select>
            </label>)}
            <label className="space-y-2 text-sm font-semibold">적용 시작일 *<Input type="date" value={form.START_DT} disabled={saving} onChange={(e) => setForm({ ...form, START_DT: e.target.value })} /></label>
            <label className="space-y-2 text-sm font-semibold">적용 종료일 *<Input type="date" value={form.END_DT} disabled={saving} onChange={(e) => setForm({ ...form, END_DT: e.target.value })} /></label>
            <label className="space-y-2 text-sm font-semibold">사용 여부<select value={form.USE_YN} disabled={saving} onChange={(e) => setForm({ ...form, USE_YN: e.target.value as "Y" | "N" })} className="h-9 w-full rounded-md border bg-white px-2 font-normal"><option value="Y">사용</option><option value="N">미사용</option></select></label>
            <label className="col-span-2 space-y-2 text-sm font-semibold">비고<textarea value={form.REMARK} maxLength={200} disabled={saving} onChange={(e) => setForm({ ...form, REMARK: e.target.value })} className="w-full rounded-md border p-2 font-normal" rows={3} /></label>
          </div>
          {dialogError && <p role="alert" className="text-sm text-red-600">{dialogError}</p>}
          <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>취소</Button><Button onClick={() => void addRoute()} disabled={saving || stopsLoading} className="bg-blue-600 text-white hover:bg-blue-700">{saving ? "등록 중..." : "완료"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={deleteOpen} onOpenChange={(open) => { if (!saving) setDeleteOpen(open); }}>
        <DialogContent showCloseButton={!saving}>
          <DialogHeader><DialogTitle>노선 삭제</DialogTitle><DialogDescription>{selectedRoute?.route_nm} ({selectedRoute?.route_id}) 노선을 삭제하시겠습니까?</DialogDescription></DialogHeader>
          <p className="text-sm text-gray-600">노선편집에 정류장·지점 구성이 남아 있으면 삭제할 수 없습니다.</p>
          {dialogError && <p role="alert" className="text-sm text-red-600">{dialogError}</p>}
          <DialogFooter><Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={saving}>취소</Button><Button onClick={() => void deleteRoute()} disabled={saving || !selectedRoute} className="bg-red-600 text-white hover:bg-red-700">{saving ? "처리 중..." : "삭제"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
