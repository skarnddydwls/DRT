"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";

import Grid from "@/components/Grid";
import { DispatchTransferDialog } from "@/components/DispatchTransferDialog";
import { DispatchTransferBadge } from "@/components/DispatchTransferBadge";
import { FilterForm } from "@/components/ui/FilterForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toast } from "@/components/ui/Toast";
import { DispatchTimeEditModal } from "@/components/DispatchTimeEditModal";
import {
  defaultFilters,
  dispatchFields,
} from "@/features/dispatch/fieldconfig";
import {
  getDispatchList,
  importDispatchMaster,
  updateReserveRoute,
  updateDispatchTime,
  type DispatchTimeUpdatePayload,
} from "@/lib/api/dispatch";
import { getDispatchMasterInfos } from "@/lib/api/dispatchMaster";
import { getDetailCodes, type DetailCodeRow } from "@/lib/api/common";
import { formatTimestamp } from "@/lib/utils";
import type {
  DispatchFilters,
  DispatchGridRow,
  DispatchRow,
  DispatchStopEntry,
} from "@/types/dispatch";
import type { DayDiv, DispatchMasterInfo, SeasonDiv } from "@/types/dispatchMaster";

interface StopTimelineCellProps
  extends ICellRendererParams<DispatchGridRow, DispatchStopEntry[]> {
  selectedStopKey: string;
  reservationGroupColors: Record<string, string>;
  onStopClick: (row: DispatchGridRow, stop: DispatchStopEntry) => void;
}

function getStopKey(row: DispatchGridRow, stop: DispatchStopEntry) {
  return `${row.dispatch_dt}-${row.route_id}-${stop.point_id}-${stop.dispatch_seq}`;
}

function StopTimelineCell({
  value,
  data,
  selectedStopKey,
  reservationGroupColors,
  onStopClick,
}: StopTimelineCellProps) {
  const stops = value ?? [];

  if (!stops.length) {
    return <span className="text-gray-400">표시할 정류장이 없습니다</span>;
  }

  return (
    <div className="flex w-full flex-wrap gap-3">
      {stops.map((stop) => {
        const stopKey = data ? getStopKey(data, stop) : "";
        const selected = selectedStopKey === stopKey;
        const groupColor = stop.ext_dispatch_div
          ? reservationGroupColors[stop.ext_dispatch_div]
          : undefined;
        return (
        <button
          type="button"
          data-dispatch-stop="true"
          key={`${stop.point_id}-${stop.dispatch_seq}-${stop.algh_dtm ?? "na"}`}
          onClick={(event) => {
            event.stopPropagation();
            if (data) onStopClick(data, stop);
          }}
          style={groupColor ? { backgroundColor: groupColor } : undefined}
          className={`relative flex w-24 flex-col rounded-lg border px-3 py-2 text-left shadow-sm transition-colors ${
            selected
              ? "border-blue-500 ring-2 ring-blue-300"
              : groupColor
                ? "border-black/10 hover:border-blue-400"
                : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50"
          }`}>
          <p className="text-xs font-medium text-gray-500">{stop.stn_nm}</p>
          <p className="text-sm font-semibold text-gray-800">
            {stop.algh_dtm ? formatTimestamp(stop.algh_dtm, "HH:mm") : "-"}
          </p>
          <DispatchTransferBadge enabled={stop.transfer_enabled} minutes={stop.transfer_minutes} time={stop.algh_dtm} />
        </button>
      )})}
    </div>
  );
}

export default function DispatchPage() {
  const gridRef = useRef(null);

  const [filters, setFilters] = useState<DispatchFilters>(defaultFilters);
  const [allRows, setAllRows] = useState<DispatchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRow, setSelectedRow] = useState<DispatchGridRow | null>(null);
  const [selectedStop, setSelectedStop] = useState<{
    row: DispatchGridRow;
    stop: DispatchStopEntry;
  } | null>(null);
  const [updatingReserve, setUpdatingReserve] = useState(false);
  const [reserveDialogOpen, setReserveDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedReserveDiv, setSelectedReserveDiv] = useState("");
  const [reservationGroups, setReservationGroups] = useState<DetailCodeRow[]>([]);
  const [reservationGroupsLoading, setReservationGroupsLoading] = useState(false);
  const reservationGroupColors = useMemo(
    () =>
      Object.fromEntries(
        reservationGroups
          .filter((code) => code.detail_code && code.value)
          .map((code) => [code.detail_code, String(code.value)])
      ),
    [reservationGroups]
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importSeason, setImportSeason] = useState<SeasonDiv>("CD001");
  const [importDay, setImportDay] = useState<DayDiv>("CD001");
  const [importMasters, setImportMasters] = useState<DispatchMasterInfo[]>([]);
  const [importMasterId, setImportMasterId] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
    isVisible: boolean;
  }>({
    message: "",
    type: "info",
    isVisible: false,
  });

  const fetchDispatchList = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getDispatchList(filters);
      setAllRows(response.dispatches);
    } catch (error) {
      console.error("Failed to fetch dispatch list:", error);
      setToast({
        message: "배차 목록을 불러오는데 실패했습니다.",
        type: "error",
        isVisible: true,
      });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void fetchDispatchList();
  }, [fetchDispatchList]);

  useEffect(() => {
    let active = true;
    setReservationGroupsLoading(true);
    getDetailCodes("EXT_DISPATCH_DIV")
      .then((response) => {
        if (!active) return;
        const codes = response.codes ?? [];
        setReservationGroups(codes);
        setSelectedReserveDiv((current) => current || codes[0]?.detail_code || "");
      })
      .catch((error) => {
        console.error("Failed to load reservation group colors:", error);
      })
      .finally(() => {
        if (active) setReservationGroupsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!importDialogOpen) return;
    let active = true;
    setImportLoading(true);
    getDispatchMasterInfos({ season_div: importSeason, day_div: importDay })
      .then(({ masters }) => {
        if (!active) return;
        const list = Array.from(new Map((masters ?? []).map((master) => [master.dispatch_id, master])).values());
        setImportMasters(list);
        setImportMasterId((current) => list.some((master) => master.dispatch_id === current) ? current : list[0]?.dispatch_id ?? "");
      })
      .catch((error) => {
        console.error("Failed to load dispatch masters:", error);
        if (active) setToast({ message: "배차마스터 목록을 불러오지 못했습니다.", type: "error", isVisible: true });
      })
      .finally(() => { if (active) setImportLoading(false); });
    return () => { active = false; };
  }, [importDialogOpen, importSeason, importDay]);

  const handleSaveDispatchTime = async (params: DispatchTimeUpdatePayload) => {
    try {
      await updateDispatchTime(params);
      setToast({
        message: "배차시간이 성공적으로 수정되었습니다.",
        type: "success",
        isVisible: true,
      });
      // 그리드 새로고침
      await fetchDispatchList();
    } catch (error) {
      console.error("Failed to update dispatch time:", error);
      setToast({
        message: "배차시간 수정에 실패했습니다.",
        type: "error",
        isVisible: true,
      });
      throw error;
    }
  };

  const filteredRows = useMemo(() => {
    const selectedDate = filters.dispatchDate?.trim();
    const filtered = selectedDate
      ? allRows.filter((row) => {
          const formatted = formatTimestamp(row.dispatch_dt, "YYYY-MM-DD");
          return formatted === selectedDate;
        })
      : allRows;

    return [...filtered].sort((a, b) => {
      const dispatchCompare = b.dispatch_dt - a.dispatch_dt;
      if (dispatchCompare !== 0) {
        return dispatchCompare;
      }

      const routeCompare = a.route_id.localeCompare(b.route_id);
      if (routeCompare !== 0) {
        return routeCompare;
      }

      return a.dispatch_seq - b.dispatch_seq;
    });
  }, [allRows, filters.dispatchDate]);

  const groupedRows = useMemo<DispatchGridRow[]>(() => {
    const routeMap = new Map<string, DispatchGridRow>();

    filteredRows.forEach((row) => {
      const key = `${row.dispatch_dt}-${row.route_id}-${row.device_id ?? row.vehicle_id}`;
      if (!routeMap.has(key)) {
        routeMap.set(key, {
          dispatch_dt: row.dispatch_dt,
          route_id: row.route_id,
          route_nm: row.route_nm ?? "",
          vehicle_id: row.vehicle_id,
          vehicle_no: row.vehicle_no ?? null,
          device_id: row.device_id ?? null,
          stops: [],
        });
      }

      const routeRow = routeMap.get(key);
      if (routeRow && row.algh_dtm != null) {
        routeRow.stops.push({
          point_id: row.point_id,
          stn_nm: row.stn_nm ?? "",
          algh_dtm: row.algh_dtm,
          dispatch_seq: row.dispatch_seq,
          remark: row.remark,
          ext_dispatch_yn: row.ext_dispatch_yn ?? null,
          ext_dispatch_div: row.ext_dispatch_div ?? null,
          transfer_enabled: row.transfer_enabled ?? false,
          transfer_minutes: row.transfer_minutes ?? 3,
        });
      }
    });

    routeMap.forEach((routeRow) => {
      routeRow.stops.sort((a, b) => a.dispatch_seq - b.dispatch_seq);
    });

    return Array.from(routeMap.values());
  }, [filteredRows]);

  const columnDefs = useMemo<ColDef<DispatchGridRow>[]>(() => {
    return [
      {
        headerName: "배차일자",
        field: "dispatch_dt",
        pinned: "left",
        sortable: true,
        minWidth: 140,
        valueFormatter: (params: { value?: number }) =>
          params.value ? formatTimestamp(params.value, "YYYY-MM-DD") : "-",
      },
      {
        headerName: "노선명",
        field: "route_nm",
        pinned: "left",
        minWidth: 140,
        cellClass: "font-semibold",
      },
      {
        headerName: "배차표",
        field: "stops",
        flex: 1,
        minWidth: 2000,
        maxWidth: 9999,
        cellRenderer: StopTimelineCell,
        cellRendererParams: {
          selectedStopKey: selectedStop
            ? getStopKey(selectedStop.row, selectedStop.stop)
            : "",
          reservationGroupColors,
          onStopClick: (row: DispatchGridRow, stop: DispatchStopEntry) => {
            setSelectedRow(row);
            setSelectedStop({ row, stop });
          },
        },
      },
    ];
  }, [reservationGroupColors, selectedStop]);

  const handleReserveRoute = async () => {
    if (!selectedStop) return;
    if (!selectedReserveDiv) {
      setToast({
        message: "예약구간을 선택해 주세요.",
        type: "info",
        isVisible: true,
      });
      return;
    }
    if (!selectedStop.row.device_id) {
      setToast({
        message: "선택한 배차에 단말기 ID가 없어 예약구간을 설정할 수 없습니다.",
        type: "error",
        isVisible: true,
      });
      return;
    }
    setUpdatingReserve(true);
    try {
      const result = await updateReserveRoute({
        route_id: selectedStop.row.route_id,
        dispatch_dt: formatTimestamp(selectedStop.row.dispatch_dt, "YYYY-MM-DD"),
        point_id: selectedStop.stop.point_id,
        dispatch_seq: selectedStop.stop.dispatch_seq,
        device_id: selectedStop.row.device_id,
        ext_dispatch_div: selectedReserveDiv,
      });
      if (!result.success) {
        throw new Error("No dispatch row was updated");
      }
      setToast({
        message: `선택한 배차시간을 예약구간 ${selectedReserveDiv}로 변경했습니다.`,
        type: "success",
        isVisible: true,
      });
      setSelectedStop(null);
      setReserveDialogOpen(false);
      await fetchDispatchList();
    } catch (error) {
      console.error("Failed to update reserve route:", error);
      setToast({
        message: "예약구간 변경에 실패했습니다.",
        type: "error",
        isVisible: true,
      });
    } finally {
      setUpdatingReserve(false);
    }
  };

  const openReserveDialog = async () => {
    setReserveDialogOpen(true);
    const currentDivision = selectedStop?.stop.ext_dispatch_div ?? "";
    if (reservationGroups.length) {
      const currentCodeExists = reservationGroups.some(
        (code) => code.detail_code === currentDivision
      );
      setSelectedReserveDiv(
        currentCodeExists ? currentDivision : reservationGroups[0].detail_code
      );
      return;
    }

    setReservationGroupsLoading(true);
    try {
      const response = await getDetailCodes("EXT_DISPATCH_DIV");
      const codes = response.codes ?? [];
      setReservationGroups(codes);
      const currentCodeExists = codes.some(
        (code) => code.detail_code === currentDivision
      );
      setSelectedReserveDiv(
        currentCodeExists ? currentDivision : codes[0]?.detail_code ?? ""
      );
    } catch (error) {
      console.error("Failed to load reservation groups:", error);
      setToast({
        message: "예약구간 코드 목록을 불러오지 못했습니다.",
        type: "error",
        isVisible: true,
      });
    } finally {
      setReservationGroupsLoading(false);
    }
  };

  const openImportDialog = () => {
    const date = new Date(`${filters.dispatchDate}T00:00:00`);
    if (!Number.isNaN(date.getTime())) {
      const month = date.getMonth() + 1;
      setImportSeason(month >= 6 && month <= 9 ? "CD001" : "CD002");
      setImportDay(date.getDay() === 0 || date.getDay() === 6 ? "CD002" : "CD001");
    }
    setImportDialogOpen(true);
  };

  const handleImportMaster = async () => {
    if (!importMasterId || !filters.dispatchDate) return;
    setImporting(true);
    try {
      const result = await importDispatchMaster({ dispatch_id: importMasterId, dispatch_dt: filters.dispatchDate });
      if (!result.success) throw new Error("No rows imported");
      setImportDialogOpen(false);
      setSelectedRow(null);
      setSelectedStop(null);
      setToast({ message: `${result.updatedCount}건의 배차를 마스터에서 불러왔습니다.`, type: "success", isVisible: true });
      await fetchDispatchList();
    } catch (error) {
      console.error("Failed to import dispatch master:", error);
      setToast({ message: "배차마스터 불러오기에 실패했습니다.", type: "error", isVisible: true });
    } finally {
      setImporting(false);
    }
  };

  return (
    <section>
      {/* 페이지 제목 & 상단 액션 바 */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">일배차관리</h1>
          <p className="mt-1 text-sm text-gray-500">일일 배차 현황을 조회하고 관리합니다.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setTransferDialogOpen(true)} disabled={!selectedStop || !selectedStop.stop.point_id.startsWith("ST")} className="bg-purple-600 text-white hover:bg-purple-700">환승 설정</Button>
          <Button onClick={openImportDialog} className="bg-blue-600 text-white hover:bg-blue-700">
            배차마스터 불러오기
          </Button>
          <Button
            onClick={() => void openReserveDialog()}
            disabled={!selectedStop || updatingReserve}
            className="bg-green-500 text-white hover:bg-green-600">
            {updatingReserve ? "처리 중..." : "예약구간"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <FilterForm<DispatchFilters>
          fields={dispatchFields}
          defaultValues={defaultFilters}
          values={filters}
          onSearch={setFilters}
          className="mb-4"
        />

        <div className="relative" style={{ height: "calc(100vh - 400px)" }}>
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-white/75 backdrop-blur-[1px]">
              <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              <p className="text-sm font-semibold text-gray-700">데이터를 불러오는 중...</p>
            </div>
          )}
          <Grid
            rowData={groupedRows}
            columnDefs={columnDefs}
            gridRef={gridRef}
            gridOptions={{
              rowSelection: "single",
              suppressRowClickSelection: false,
              onRowClicked: (params) => {
                const target = params.event?.target;
                if (
                  target instanceof Element &&
                  target.closest('[data-dispatch-stop="true"]')
                ) {
                  return;
                }
                if (params.data) {
                  setSelectedRow(params.data);
                  setSelectedStop(null);
                }
              },
              getRowStyle: (params) => {
                if (
                  selectedRow &&
                  params.data?.route_id === selectedRow.route_id &&
                  params.data?.dispatch_dt === selectedRow.dispatch_dt
                ) {
                  return { backgroundColor: "#dbeafe" }; // blue-100
                }
                return undefined;
              },
            }}
            height="100%"
            enableNumberColoring={true}
            rowHeight={60}
          />
        </div>

        {/* 배차시간 편집 모달 */}
        <DispatchTimeEditModal
          open={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
          }}
          selectedRow={selectedRow}
          onSave={handleSaveDispatchTime}
        />

        <DispatchTransferDialog open={transferDialogOpen} onClose={() => setTransferDialogOpen(false)}
        target={selectedStop ? {
          ...selectedStop.stop, route_id: selectedStop.row.route_id,
          dispatch_dt: formatTimestamp(selectedStop.row.dispatch_dt, "YYYY-MM-DD"),
          label: `${selectedStop.row.route_nm} · ${selectedStop.stop.stn_nm} · ${formatTimestamp(selectedStop.stop.algh_dtm ?? 0, "HH:mm")}`,
        } : null}
        onSaved={(settings) => {
          if (!selectedStop) return;
          const chosen = selectedStop;
          setAllRows(rows => rows.map(row => row.dispatch_dt === chosen.row.dispatch_dt && row.route_id === chosen.row.route_id && row.point_id === chosen.stop.point_id && row.dispatch_seq === chosen.stop.dispatch_seq ? { ...row, ...settings } : row));
          setSelectedStop({ ...chosen, stop: { ...chosen.stop, ...settings } });
          setToast({ message: "환승 설정을 저장했습니다.", type: "success", isVisible: true });
        }} />
      <Dialog open={reserveDialogOpen} onOpenChange={setReserveDialogOpen}>
          <DialogContent className="sm:max-w-[430px]">
            <DialogHeader>
              <DialogTitle>예약구간 설정</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-2">
              <div
                className="rounded-xl border border-black/10 bg-gray-50 p-4 transition-colors"
                style={
                  reservationGroupColors[selectedReserveDiv]
                    ? { backgroundColor: reservationGroupColors[selectedReserveDiv] }
                    : undefined
                }>
                <p className="text-xs font-semibold text-gray-700">선택한 배차시간</p>
                <div className="mt-2 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-500">정류장</p>
                    <p className="mt-1 text-lg font-bold text-gray-900">
                      {selectedStop?.stop.stn_nm || "-"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">도착시각</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                      {selectedStop?.stop.algh_dtm
                        ? formatTimestamp(selectedStop.stop.algh_dtm, "HH:mm")
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  예약구간
                </label>
                <Select
                  value={selectedReserveDiv}
                  onValueChange={setSelectedReserveDiv}
                  disabled={reservationGroupsLoading}>
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        reservationGroupsLoading
                          ? "예약구간을 불러오는 중..."
                          : "예약구간을 선택하세요"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {reservationGroups.map((code) => (
                      <SelectItem key={code.detail_code} value={code.detail_code}>
                        {code.label || code.value || code.detail_code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!reservationGroupsLoading && !reservationGroups.length && (
                  <p className="mt-2 text-xs font-medium text-red-500">
                    등록된 예약구간 코드가 없습니다.
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  선택한 운행편에서 활성화할 예약구간을 지정합니다.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReserveDialogOpen(false)} disabled={updatingReserve}>
                취소
              </Button>
              <Button onClick={handleReserveRoute} disabled={updatingReserve || reservationGroupsLoading || !selectedReserveDiv} className="bg-green-500 text-white hover:bg-green-600">
                {updatingReserve ? "처리 중..." : "확인"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent className="w-[480px] max-w-[calc(100vw-32px)]">
            <DialogHeader><DialogTitle>배차마스터 불러오기</DialogTitle></DialogHeader>
            <div className="space-y-5">
              <div className="rounded-xl border bg-blue-50 p-4">
                <p className="text-xs text-blue-700">생성할 일배차 날짜</p>
                <p className="mt-1 text-xl font-bold text-blue-950">{filters.dispatchDate}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-2 text-sm font-semibold">계절 구분
                  <select className="h-10 w-full rounded-md border bg-white px-3 font-normal" value={importSeason} onChange={(event) => setImportSeason(event.target.value as SeasonDiv)}>
                    <option value="CD001">하계</option><option value="CD002">동계</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm font-semibold">요일 구분
                  <select className="h-10 w-full rounded-md border bg-white px-3 font-normal" value={importDay} onChange={(event) => setImportDay(event.target.value as DayDiv)}>
                    <option value="CD001">평일</option><option value="CD002">주말</option>
                  </select>
                </label>
              </div>
              <label className="block space-y-2 text-sm font-semibold">배차마스터
                <select className="h-10 w-full rounded-md border bg-white px-3 font-normal" value={importMasterId} disabled={importLoading} onChange={(event) => setImportMasterId(event.target.value)}>
                  {importMasters.map((master) => <option key={master.dispatch_id} value={master.dispatch_id}>{master.dispatch_nm}</option>)}
                </select>
              </label>
              {!importLoading && !importMasters.length && <p className="text-sm text-red-500">선택한 구분에 등록된 배차마스터가 없습니다.</p>}
              <p className="text-xs leading-5 text-gray-500">같은 날짜에 동일한 노선·지점·순번이 있으면 마스터의 시간·예약구간·환승 설정으로 갱신됩니다. 기존 차량·단말기 정보는 유지됩니다.</p>
            </div>
            <DialogFooter className="mt-6"><Button variant="outline" onClick={() => setImportDialogOpen(false)} disabled={importing}>취소</Button><Button onClick={() => void handleImportMaster()} disabled={importing || importLoading || !importMasterId} className="bg-blue-600 text-white hover:bg-blue-700">{importing ? "불러오는 중..." : "불러오기"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 토스트 알림 */}
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
        />
      </div>
    </section>
  );
}
