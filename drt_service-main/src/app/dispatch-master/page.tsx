"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import Grid from "@/components/Grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Toast } from "@/components/ui/Toast";
import { getDetailCodes, type DetailCodeRow } from "@/lib/api/common";
import {
  getDispatchMasterInfos,
  getDispatchMasterRows,
  saveDispatchMasterInfo,
  updateDispatchMasterReserveRoute,
  updateDispatchMasterTime,
} from "@/lib/api/dispatchMaster";
import { formatTimestamp } from "@/lib/utils";
import type {
  DayDiv,
  DispatchMasterGridRow,
  DispatchMasterInfo,
  DispatchMasterSavePayload,
  DispatchMasterStop,
  SeasonDiv,
} from "@/types/dispatchMaster";

const seasonOptions: Array<{ code: SeasonDiv; label: string; }> = [
  { code: "CD001", label: "하계 배차" },
  { code: "CD002", label: "동계 배차" },
];

const dayOptions: Array<{ code: DayDiv; label: string }> = [
  { code: "CD001", label: "평일 배차" },
  { code: "CD002", label: "주말 배차" },
  { code: "CD003", label: "목요 배차" },
];

const emptyForm: DispatchMasterSavePayload = {
  dispatch_id: "",
  dispatch_nm: "",
  season_div: "CD001",
  day_div: "CD001",
  valid_from: "",
  valid_to: "",
  use_yn: "Y",
  remark: "",
};

function dateText(value: number | string | null) {
  return value ? formatTimestamp(value, "YYYY-MM-DD") || String(value).slice(0, 10) : "";
}

function MasterTimeline({
  value,
  data,
  colors,
  selectedStopKey,
  onStopClick,
}: ICellRendererParams<DispatchMasterGridRow, DispatchMasterStop[]> & {
  colors: Record<string, string>;
  selectedStopKey: string;
  onStopClick: (row: DispatchMasterGridRow, stop: DispatchMasterStop) => void;
}) {
  return (
    <div className="flex w-full flex-wrap gap-3">
      {(value ?? []).map((stop) => {
        const stopKey = `${data?.route_id}-${stop.point_id}-${stop.dispatch_seq}`;
        const selected = stopKey === selectedStopKey;
        return (
          <button
            type="button"
            data-master-stop="true"
            key={`${stop.point_id}-${stop.dispatch_seq}`}
            onClick={(event) => {
              event.stopPropagation();
              if (data) onStopClick(data, stop);
            }}
            className={`flex w-24 flex-col rounded-lg border bg-white px-3 py-2 text-left shadow-sm transition ${selected ? "border-blue-500 ring-2 ring-blue-300" : "border-black/10 hover:border-blue-400"}`}
            style={stop.ext_dispatch_div && colors[stop.ext_dispatch_div]
              ? { backgroundColor: colors[stop.ext_dispatch_div] }
              : undefined}>
            <span className="truncate text-xs font-medium text-gray-500">{stop.point_nm || stop.point_id}</span>
            <span className="text-sm font-bold text-gray-800">
              {stop.algh_dtm ? formatTimestamp(stop.algh_dtm, "HH:mm") : "-"}
            </span>
          </button>
        )
      })}
    </div>
  );
}

export default function DispatchMasterPage() {
  const gridRef = useRef(null);
  const [season, setSeason] = useState<SeasonDiv>("CD001");
  const [day, setDay] = useState<DayDiv>("CD001");
  const [masters, setMasters] = useState<DispatchMasterInfo[]>([]);
  const [selected, setSelected] = useState<DispatchMasterInfo | null>(null);
  const [detailRows, setDetailRows] = useState<DispatchMasterGridRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedTime, setSelectedTime] = useState("");
  const [form, setForm] = useState<DispatchMasterSavePayload>(emptyForm);
  const [colors, setColors] = useState<Record<string, string>>({});
  const [reservationGroups, setReservationGroups] = useState<DetailCodeRow[]>([]);
  const [selectedStop, setSelectedStop] = useState<{ row: DispatchMasterGridRow; stop: DispatchMasterStop } | null>(null);
  const [reserveDialogOpen, setReserveDialogOpen] = useState(false);
  const [selectedReserveDiv, setSelectedReserveDiv] = useState("");
  const [updatingReserve, setUpdatingReserve] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "info" as "success" | "error" | "info", isVisible: false });

  const loadMasters = useCallback(async (preferredId?: string) => {
    setLoading(true);
    try {
      const response = await getDispatchMasterInfos({ season_div: season, day_div: day });
      const list = Array.from(
        new Map(
          (response.masters ?? []).map((master) => [master.dispatch_id, master])
        ).values()
      );
      setMasters(list);
      setSelected((current) => list.find((item) => item.dispatch_id === (preferredId ?? current?.dispatch_id)) ?? list[0] ?? null);
    } catch (error) {
      console.error(error);
      setToast({ message: "배차마스터 목록을 불러오지 못했습니다.", type: "error", isVisible: true });
    } finally {
      setLoading(false);
    }
  }, [season, day]);

  useEffect(() => { void loadMasters(); }, [loadMasters]);

  useEffect(() => {
    getDetailCodes("EXT_DISPATCH_DIV").then(({ codes }) => {
      setReservationGroups(codes ?? []);
      setColors(Object.fromEntries((codes ?? []).filter((code) => code.detail_code && code.value).map((code) => [code.detail_code, String(code.value)])));
    }).catch(() => setColors({}));
  }, []);

  useEffect(() => {
    if (!selected) {
      setDetailRows([]);
      return;
    }
    let active = true;
    setDetailLoading(true);
    getDispatchMasterRows(selected.dispatch_id)
      .then(({ dispatches }) => {
        if (!active) return;
        const grouped = new Map<string, DispatchMasterGridRow>();
        dispatches.forEach((row) => {
          const key = row.route_id;
          if (!grouped.has(key)) grouped.set(key, {
            route_id: row.route_id,
            route_nm: row.route_nm || row.route_id,
            stops: [],
          });
          grouped.get(key)?.stops.push({
            point_id: row.point_id,
            point_nm: row.point_nm || row.point_id,
            dispatch_seq: Number(row.dispatch_seq),
            device_id: row.device_id,
            algh_dtm: row.algh_dtm,
            ext_dispatch_div: row.ext_dispatch_div,
          });
        });
        grouped.forEach((row) => row.stops.sort((a, b) => a.dispatch_seq - b.dispatch_seq));
        setDetailRows(Array.from(grouped.values()));
        setSelectedStop(null);
      })
      .catch((error) => {
        console.error(error);
        setToast({ message: "배차표 상세를 불러오지 못했습니다.", type: "error", isVisible: true });
      })
      .finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [selected]);

  const columnDefs = useMemo<ColDef<DispatchMasterGridRow>[]>(() => [
    { headerName: "노선명", field: "route_nm", pinned: "left", width: 150, cellClass: "font-semibold" },
    {
      headerName: "배차표",
      field: "stops",
      flex: 1,
      minWidth: 1700,
      maxWidth: 9999,
      cellRenderer: MasterTimeline,
      cellRendererParams: {
        colors,
        selectedStopKey: selectedStop ? `${selectedStop.row.route_id}-${selectedStop.stop.point_id}-${selectedStop.stop.dispatch_seq}` : "",
        onStopClick: (row: DispatchMasterGridRow, stop: DispatchMasterStop) => setSelectedStop({ row, stop }),
      },
    },
  ], [colors, selectedStop]);

  const openReserveDialog = () => {
    if (!selectedStop) return;
    const current = selectedStop.stop.ext_dispatch_div ?? "";
    setSelectedReserveDiv(
      reservationGroups.some((code) => code.detail_code === current)
        ? current
        : reservationGroups[0]?.detail_code ?? ""
    );
    setReserveDialogOpen(true);
  };

  const saveReserveRoute = async () => {
    if (!selected || !selectedStop || !selectedReserveDiv) return;
    setUpdatingReserve(true);
    try {
      const result = await updateDispatchMasterReserveRoute({
        dispatch_id: selected.dispatch_id,
        route_id: selectedStop.row.route_id,
        point_id: selectedStop.stop.point_id,
        dispatch_seq: selectedStop.stop.dispatch_seq,
        device_id: selectedStop.stop.device_id,
        ext_dispatch_div: selectedReserveDiv,
      });
      if (!result.success) throw new Error("No row updated");
      setDetailRows((rows) => rows.map((row) => row.route_id !== selectedStop.row.route_id ? row : {
        ...row,
        stops: row.stops.map((stop) => stop.point_id === selectedStop.stop.point_id && stop.dispatch_seq === selectedStop.stop.dispatch_seq
          ? { ...stop, ext_dispatch_div: selectedReserveDiv }
          : stop),
      }));
      setSelectedStop((current) => current ? { ...current, stop: { ...current.stop, ext_dispatch_div: selectedReserveDiv } } : null);
      setReserveDialogOpen(false);
      setToast({ message: "예약구간을 저장했습니다.", type: "success", isVisible: true });
    } catch (error) {
      console.error(error);
      setToast({ message: "예약구간 저장에 실패했습니다.", type: "error", isVisible: true });
    } finally {
      setUpdatingReserve(false);
    }
  };

  const openEdit = () => {
    if (!selected) return;
    setEditing(true);
    setForm({
      dispatch_id: selected.dispatch_id,
      dispatch_nm: selected.dispatch_nm,
      season_div: selected.season_div,
      day_div: selected.day_div,
      valid_from: dateText(selected.valid_from),
      valid_to: dateText(selected.valid_to),
      use_yn: selected.use_yn,
      remark: selected.remark ?? "",
    });
    setSelectedTime(
      selectedStop?.stop.algh_dtm
        ? formatTimestamp(selectedStop.stop.algh_dtm, "HH:mm")
        : ""
    );
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.dispatch_id.trim() || !form.dispatch_nm.trim()) {
      setToast({ message: "배차 ID와 배차명을 입력해 주세요.", type: "info", isVisible: true });
      return;
    }
    if (form.valid_from && form.valid_to && form.valid_from > form.valid_to) {
      setToast({ message: "적용 종료일은 시작일보다 빠를 수 없습니다.", type: "info", isVisible: true });
      return;
    }
    setSaving(true);
    try {
      const result = await saveDispatchMasterInfo(form);
      if (!result.success) throw new Error("Save failed");
      if (selectedStop && selectedTime) {
        const timeResult = await updateDispatchMasterTime({
          dispatch_id: form.dispatch_id,
          route_id: selectedStop.row.route_id,
          point_id: selectedStop.stop.point_id,
          dispatch_seq: selectedStop.stop.dispatch_seq,
          device_id: selectedStop.stop.device_id,
          algh_tm: selectedTime,
        });
        if (!timeResult.success) throw new Error("Time update failed");
        setDetailRows((rows) => rows.map((row) => row.route_id !== selectedStop.row.route_id ? row : {
          ...row,
          stops: row.stops.map((stop) => stop.point_id === selectedStop.stop.point_id && stop.dispatch_seq === selectedStop.stop.dispatch_seq
            ? { ...stop, algh_dtm: `${String(stop.algh_dtm ?? "").slice(0, 10)} ${selectedTime}` }
            : stop),
        }));
      }
      setSeason(form.season_div);
      setDay(form.day_div);
      setDialogOpen(false);
      setToast({ message: "배차마스터 정보를 저장했습니다.", type: "success", isVisible: true });
      await loadMasters(form.dispatch_id);
    } catch (error) {
      console.error(error);
      setToast({ message: "배차마스터 저장에 실패했습니다.", type: "error", isVisible: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border bg-white p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">배차마스터 관리</h1>
          <p className="mt-1 text-sm text-gray-500">계절과 요일 유형별 기준 배차표를 관리합니다.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openReserveDialog} disabled={!selectedStop} className="bg-green-500 text-white hover:bg-green-600">예약구간</Button>
          <Button variant="outline" onClick={openEdit} disabled={!selected}>정보 수정</Button>
        </div>
      </div>

      {/* 2단계 세그먼트 컨트롤 탭바 (Option 1) */}
      <div className="mb-6 flex flex-wrap items-center gap-6 rounded-xl border border-gray-200 bg-gray-50/80 p-2.5">
        {/* 1. 계절 선택 */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-gray-500">계절</span>
          <div className="flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
            {seasonOptions.map((item) => {
              const active = season === item.code;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setSeason(item.code)}
                  className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-semibold transition ${active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 구분선 */}
        <div className="hidden h-7 w-px bg-gray-300 sm:block" />

        {/* 2. 운행 구분 선택 */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-gray-500">운행 구분</span>
          <div className="flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
            {dayOptions.map((item) => {
              const active = day === item.code;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setDay(item.code)}
                  className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}>
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">{selected ? `${selected.dispatch_nm} 배차표` : "배차표"}</h2>
            {selected?.remark && (
              <p className="mt-1 text-xs text-gray-500">{selected.remark}</p>
            )}
          </div>
          {masters.length > 1 && (
            <label className="flex shrink-0 items-center gap-2 text-sm font-medium text-gray-600">
              배차마스터
              <select
                className="h-9 min-w-52 rounded-md border bg-white px-3 text-sm font-normal"
                value={selected?.dispatch_id ?? ""}
                disabled={loading}
                onChange={(event) => {
                  const next = masters.find((master) => master.dispatch_id === event.target.value);
                  setSelected(next ?? null);
                }}>
                {masters.map((master) => (
                  <option key={master.dispatch_id} value={master.dispatch_id}>
                    {master.dispatch_nm}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {loading || detailLoading ? (
          <div className="flex h-[600px] items-center justify-center rounded-xl border">
            <span className="text-sm text-gray-500">배차표 조회 중...</span>
          </div>
        ) : (
          <Grid rowData={detailRows} columnDefs={columnDefs} gridRef={gridRef} height={600} rowHeight={64} gridOptions={{ getRowId: (params) => params.data.route_id }} />
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[560px] max-w-[calc(100vw-32px)]">
          <DialogHeader><DialogTitle>{editing ? "배차마스터 정보 수정" : "신규 배차마스터"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <label className="space-y-2 text-sm font-semibold">배차 ID<Input value={form.dispatch_id} disabled={editing} maxLength={10} onChange={(e) => setForm({ ...form, dispatch_id: e.target.value })} placeholder="예: DM00000001" /></label>
            <label className="space-y-2 text-sm font-semibold">배차명<Input value={form.dispatch_nm} maxLength={30} onChange={(e) => setForm({ ...form, dispatch_nm: e.target.value })} placeholder="예: 2026 하계 평일" /></label>
            <label className="space-y-2 text-sm font-semibold">계절 구분<select className="h-9 w-full rounded-md border bg-white px-3 font-normal" value={form.season_div} onChange={(e) => setForm({ ...form, season_div: e.target.value as SeasonDiv })}><option value="CD001">하계</option><option value="CD002">동계</option></select></label>
            <label className="space-y-2 text-sm font-semibold">요일 구분<select className="h-9 w-full rounded-md border bg-white px-3 font-normal" value={form.day_div} onChange={(e) => setForm({ ...form, day_div: e.target.value as DayDiv })}><option value="CD001">평일</option><option value="CD002">주말</option><option value="CD003">목요일</option></select></label>
            <label className="space-y-2 text-sm font-semibold">적용 시작일<Input type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} /></label>
            <label className="space-y-2 text-sm font-semibold">적용 종료일<Input type="date" value={form.valid_to} onChange={(e) => setForm({ ...form, valid_to: e.target.value })} /></label>
            <label className="space-y-2 text-sm font-semibold">사용 여부<select className="h-9 w-full rounded-md border bg-white px-3 font-normal" value={form.use_yn} onChange={(e) => setForm({ ...form, use_yn: e.target.value as "Y" | "N" })}><option value="Y">사용</option><option value="N">미사용</option></select></label>
            <label className="space-y-2 text-sm font-semibold">비고<Input value={form.remark} maxLength={200} onChange={(e) => setForm({ ...form, remark: e.target.value })} /></label>
          </div>
          <div className="mt-5 border-t pt-5">
            <p className="mb-3 text-sm font-semibold">배차시간 수정</p>
            {selectedStop ? (
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
                <div>
                  <p className="text-xs text-gray-500">선택 정류장</p>
                  <p className="mt-1 font-semibold">{selectedStop.stop.point_nm}</p>
                </div>
                <label className="space-y-2 text-xs text-gray-500">도착시각
                  <Input type="time" value={selectedTime} onChange={(event) => setSelectedTime(event.target.value)} className="bg-white text-sm text-gray-900" />
                </label>
              </div>
            ) : (
              <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">배차표에서 시간 카드를 선택하면 도착시각을 수정할 수 있습니다.</p>
            )}
          </div>
          <DialogFooter className="mt-6"><Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>취소</Button><Button onClick={() => void save()} disabled={saving} className="bg-blue-600 text-white hover:bg-blue-700">{saving ? "저장 중..." : "저장"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={reserveDialogOpen} onOpenChange={setReserveDialogOpen}>
        <DialogContent className="w-[430px] max-w-[calc(100vw-32px)]">
          <DialogHeader><DialogTitle>예약구간 설정</DialogTitle></DialogHeader>
          <div className="space-y-5">
            <div className="rounded-xl border border-black/10 p-4" style={colors[selectedReserveDiv] ? { backgroundColor: colors[selectedReserveDiv] } : undefined}>
              <p className="text-xs font-semibold text-gray-700">선택한 배차시간</p>
              <div className="mt-2 flex items-end justify-between gap-4">
                <div><p className="text-sm text-gray-500">정류장</p><p className="mt-1 text-lg font-bold">{selectedStop?.stop.point_nm || "-"}</p></div>
                <div className="text-right"><p className="text-sm text-gray-500">도착시각</p><p className="mt-1 text-2xl font-bold">{selectedStop?.stop.algh_dtm ? formatTimestamp(selectedStop.stop.algh_dtm, "HH:mm") : "-"}</p></div>
              </div>
            </div>
            <label className="block space-y-2 text-sm font-semibold">예약구간
              <select className="h-10 w-full rounded-md border bg-white px-3 font-normal" value={selectedReserveDiv} onChange={(event) => setSelectedReserveDiv(event.target.value)}>
                {reservationGroups.map((code) => <option key={code.detail_code} value={code.detail_code}>{code.label || code.detail_code}</option>)}
              </select>
            </label>
          </div>
          <DialogFooter className="mt-6"><Button variant="outline" onClick={() => setReserveDialogOpen(false)} disabled={updatingReserve}>취소</Button><Button onClick={() => void saveReserveRoute()} disabled={updatingReserve || !selectedReserveDiv} className="bg-green-500 text-white hover:bg-green-600">{updatingReserve ? "저장 중..." : "확인"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Toast {...toast} onClose={() => setToast((value) => ({ ...value, isVisible: false }))} />
    </section>
  );
}
