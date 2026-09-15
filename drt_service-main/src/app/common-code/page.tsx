"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import Grid from "@/components/Grid";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Toast } from "@/components/ui/Toast";
import type { ColDef, RowClickedEvent } from "ag-grid-community";

/* -------------------------------------------------------------------------- */
/*  1. Types & Interfaces                                                     */
/* -------------------------------------------------------------------------- */

export interface CommonGroupCode {
  common_code: string;
  common_nm: string;
  use_yn?: "Y" | "N";
  remark?: string;
  sort_order?: number;
}

export interface CommonDetailCode {
  common_code: string;
  detail_code: string;
  val_1?: string;
  val_2?: string;
  val_3?: string;
  remark?: string;
  use_yn: "Y" | "N";
  sys_yn: "Y" | "N";
  sort_order?: number;
}

/* -------------------------------------------------------------------------- */
/*  2. Mock Data (스크린샷 실물 데이터 완벽 일치 + DRT 배차코드 연동)             */
/* -------------------------------------------------------------------------- */

const INITIAL_GROUPS: CommonGroupCode[] = [

];

const INITIAL_DETAILS: Record<string, CommonDetailCode[]> = {
  RIDE_OPRN_DT: [

  ],
  EXT_DISPATCH_DIV: [

  ],
  SEASON_DIV: [

  ],
  DAY_DIV: [

  ],
  NOTI_TYPE: [

  ],
};

/* -------------------------------------------------------------------------- */
/*  3. Main Component                                                         */
/* -------------------------------------------------------------------------- */

export default function CommonCodePage() {
  const groupGridRef = useRef(null);
  const detailGridRef = useRef(null);

  // 데이터 상태
  const [groups, setGroups] = useState<CommonGroupCode[]>(INITIAL_GROUPS);
  const [detailsMap, setDetailsMap] =
    useState<Record<string, CommonDetailCode[]>>(INITIAL_DETAILS);

  // 현재 선택된 그룹 (스크린샷 기본 선택: RIDE_OPRN_DT)
  const [selectedGroupCode, setSelectedGroupCode] =
    useState<string>("RIDE_OPRN_DT");

  // 선택된 상세코드 행 (수정/삭제용)
  const [selectedDetailCode, setSelectedDetailCode] = useState<string | null>(null);

  // 토스트 상태
  const [toast, setToast] = useState<{
    isVisible: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({
    isVisible: false,
    message: "",
    type: "info",
  });

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "success") => {
      setToast({ isVisible: true, message, type });
    },
    []
  );

  // 모달 상태: 그룹 코드
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupModalMode, setGroupModalMode] = useState<"add" | "edit">("add");
  const [groupForm, setGroupForm] = useState<CommonGroupCode>({
    common_code: "",
    common_nm: "",
  });

  // 모달 상태: 상세 코드
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailModalMode, setDetailModalMode] = useState<"add" | "edit">("add");
  const [detailForm, setDetailForm] = useState<CommonDetailCode>({
    common_code: "",
    detail_code: "",
    val_1: "",
    val_2: "",
    val_3: "",
    remark: "",
    use_yn: "Y",
    sys_yn: "Y",
  });

  // 현재 선택된 그룹 객체
  const currentGroup = useMemo(
    () => groups.find((g) => g.common_code === selectedGroupCode),
    [groups, selectedGroupCode]
  );

  // 현재 선택된 그룹의 상세코드 목록
  const currentDetails = useMemo(
    () => detailsMap[selectedGroupCode] || [],
    [detailsMap, selectedGroupCode]
  );

  /* ------------------------------------------------------------------------ */
  /*  핸들러: 그룹 CRUD                                                       */
  /* ------------------------------------------------------------------------ */

  const handleOpenAddGroup = () => {
    setGroupModalMode("add");
    setGroupForm({ common_code: "", common_nm: "" });
    setIsGroupModalOpen(true);
  };

  const handleOpenEditGroup = () => {
    if (!currentGroup) {
      alert("수정할 공통코드를 먼저 선택해주세요.");
      return;
    }
    setGroupModalMode("edit");
    setGroupForm({ ...currentGroup });
    setIsGroupModalOpen(true);
  };

  const handleDeleteGroup = () => {
    if (!currentGroup) {
      alert("삭제할 공통코드를 선택해주세요.");
      return;
    }
    if (!window.confirm(`[${currentGroup.common_code}] 그룹을 삭제하시겠습니까?`)) {
      return;
    }

    setGroups((prev) => prev.filter((g) => g.common_code !== currentGroup.common_code));
    setDetailsMap((prev) => {
      const next = { ...prev };
      delete next[currentGroup.common_code];
      return next;
    });

    const remaining = groups.filter((g) => g.common_code !== currentGroup.common_code);
    setSelectedGroupCode(remaining.length > 0 ? remaining[0].common_code : "");
    showToast(`그룹 코드 [${currentGroup.common_code}]가 삭제되었습니다.`, "info");
  };

  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupForm.common_code.trim()) {
      alert("공통코드를 입력해주세요.");
      return;
    }
    if (!groupForm.common_nm.trim()) {
      alert("공통코드명을 입력해주세요.");
      return;
    }

    if (groupModalMode === "add") {
      const exists = groups.some((g) => g.common_code === groupForm.common_code);
      if (exists) {
        alert("이미 존재하는 공통코드입니다.");
        return;
      }
      setGroups((prev) => [...prev, groupForm]);
      setDetailsMap((prev) => ({ ...prev, [groupForm.common_code]: [] }));
      setSelectedGroupCode(groupForm.common_code);
      showToast(`공통코드 [${groupForm.common_code}]가 등록되었습니다.`);
    } else {
      setGroups((prev) =>
        prev.map((g) => (g.common_code === groupForm.common_code ? groupForm : g))
      );
      showToast(`공통코드 [${groupForm.common_code}]가 수정되었습니다.`);
    }
    setIsGroupModalOpen(false);
  };

  /* ------------------------------------------------------------------------ */
  /*  핸들러: 상세코드 CRUD                                                   */
  /* ------------------------------------------------------------------------ */

  const handleOpenAddDetail = () => {
    if (!selectedGroupCode) {
      alert("공통코드를 먼저 선택해주세요.");
      return;
    }
    setDetailModalMode("add");
    setDetailForm({
      common_code: selectedGroupCode,
      detail_code: "",
      val_1: "",
      val_2: "",
      val_3: "",
      remark: "",
      use_yn: "Y",
      sys_yn: "Y",
    });
    setIsDetailModalOpen(true);
  };

  const handleOpenEditDetail = () => {
    const target = currentDetails.find((d) => d.detail_code === selectedDetailCode);
    if (!target) {
      alert("수정할 상세코드를 행에서 먼저 클릭해 선택해주세요.");
      return;
    }
    setDetailModalMode("edit");
    setDetailForm({ ...target });
    setIsDetailModalOpen(true);
  };

  const handleDeleteDetail = () => {
    if (!selectedDetailCode) {
      alert("삭제할 상세코드를 행에서 먼저 클릭해 선택해주세요.");
      return;
    }
    if (!window.confirm(`상세코드 [${selectedDetailCode}]를 삭제하시겠습니까?`)) {
      return;
    }

    setDetailsMap((prev) => ({
      ...prev,
      [selectedGroupCode]: (prev[selectedGroupCode] || []).filter(
        (d) => d.detail_code !== selectedDetailCode
      ),
    }));
    setSelectedDetailCode(null);
    showToast(`상세코드 [${selectedDetailCode}]가 삭제되었습니다.`, "info");
  };

  const handleSaveDetail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailForm.detail_code.trim()) {
      alert("상세코드를 입력해주세요.");
      return;
    }

    const currentList = detailsMap[selectedGroupCode] || [];

    if (detailModalMode === "add") {
      const exists = currentList.some((d) => d.detail_code === detailForm.detail_code);
      if (exists) {
        alert("해당 그룹에 이미 존재하는 상세코드입니다.");
        return;
      }
      setDetailsMap((prev) => ({
        ...prev,
        [selectedGroupCode]: [...currentList, detailForm],
      }));
      showToast(`상세코드 [${detailForm.detail_code}]가 추가되었습니다.`);
    } else {
      setDetailsMap((prev) => ({
        ...prev,
        [selectedGroupCode]: currentList.map((d) =>
          d.detail_code === detailForm.detail_code ? detailForm : d
        ),
      }));
      showToast(`상세코드 [${detailForm.detail_code}]가 수정되었습니다.`);
    }
    setIsDetailModalOpen(false);
  };

  /* ------------------------------------------------------------------------ */
  /*  4. AG Grid Column Definitions (스크린샷과 100% 동일한 헤더 및 중앙 정렬) */
  /* ------------------------------------------------------------------------ */

  // 마스터(공통코드 목록): 딱 2개 컬럼!
  const groupColumnDefs: ColDef[] = useMemo(
    () => [
      {
        headerName: "공통코드",
        field: "common_code",
        flex: 1,
        minWidth: 120,
        cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" },
        cellRenderer: (params: { value: string }) => (
          <span className="font-semibold text-gray-800 text-xs tracking-tight">
            {params.value}
          </span>
        ),
      },
      {
        headerName: "공통코드명",
        field: "common_nm",
        flex: 1.2,
        minWidth: 130,
        cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" },
        cellRenderer: (params: { value: string }) => (
          <span className="text-gray-700 text-xs font-medium">{params.value}</span>
        ),
      },
    ],
    []
  );

  // 디테일(상세코드 목록): 스크린샷 7개 컬럼 완전 일치!
  const detailColumnDefs: ColDef[] = useMemo(
    () => [
      {
        headerName: "상세코드",
        field: "detail_code",
        width: 110,
        cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" },
        cellRenderer: (params: { value: string }) => (
          <span className="font-medium text-gray-800 text-xs">{params.value}</span>
        ),
      },
      {
        headerName: "값1",
        field: "val_1",
        flex: 1.2,
        minWidth: 110,
        cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" },
        cellRenderer: (params: { value: string }) => {
          if (!params.value) return <span className="text-gray-400 text-xs">-</span>;
          const isHex = /^#[0-9A-Fa-f]{6}$/.test(params.value);
          return (
            <div className="flex items-center justify-center gap-1.5">
              {isHex && (
                <span
                  className="w-3 h-3 rounded-xs border border-gray-300 shrink-0"
                  style={{ backgroundColor: params.value }}
                />
              )}
              <span className="text-gray-700 text-xs">{params.value}</span>
            </div>
          );
        },
      },
      {
        headerName: "값2",
        field: "val_2",
        flex: 1.2,
        minWidth: 110,
        cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" },
        cellRenderer: (params: { value: string }) => (
          <span className="text-gray-700 text-xs">{params.value || ""}</span>
        ),
      },
      {
        headerName: "값3",
        field: "val_3",
        flex: 1,
        minWidth: 90,
        cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" },
        cellRenderer: (params: { value: string }) => (
          <span className="text-gray-700 text-xs">{params.value || ""}</span>
        ),
      },
      {
        headerName: "비고",
        field: "remark",
        flex: 1.4,
        minWidth: 120,
        cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" },
        cellRenderer: (params: { value: string }) => (
          <span className="text-gray-500 text-xs truncate block" title={params.value}>
            {params.value || ""}
          </span>
        ),
      },
      {
        headerName: "사용여부",
        field: "use_yn",
        width: 90,
        cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" },
        cellRenderer: (params: { value: string }) => (
          <span className="text-gray-800 text-xs font-semibold">{params.value}</span>
        ),
      },
      {
        headerName: "시스템코드유무",
        field: "sys_yn",
        width: 120,
        cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" },
        cellRenderer: (params: { value: string }) => (
          <span className="text-gray-800 text-xs font-semibold">{params.value}</span>
        ),
      },
    ],
    []
  );

  // 행 클릭 이벤트
  const onGroupRowClicked = useCallback(
    (event: RowClickedEvent<Record<string, unknown>>) => {
      const row = event.data as unknown as CommonGroupCode;
      if (row && row.common_code) {
        setSelectedGroupCode(row.common_code);
        setSelectedDetailCode(null);
      }
    },
    []
  );

  const onDetailRowClicked = useCallback(
    (event: RowClickedEvent<Record<string, unknown>>) => {
      const row = event.data as unknown as CommonDetailCode;
      if (row && row.detail_code) {
        setSelectedDetailCode(row.detail_code);
      }
    },
    []
  );

  return (
    <section>
      {/* -------------------------------------------------------------------- */}
      {/*  페이지 상단 타이틀 (다른 페이지와 100% 동일한 헤더 구조)              */}
      {/* -------------------------------------------------------------------- */}
      <div className="mb-6">
        <h1 className="text-[28px] font-bold tracking-tight">공통코드 관리</h1>
        <p className="mt-1 text-sm text-gray-500">
          시스템 공통 코드를 조회하고 관리합니다.
        </p>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/*  상단 2열 헤더 영역 (공통코드 목록 / 상세코드 목록)                    */}
      {/* -------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-end mb-2.5">
        {/* 좌측 타이틀 & 액션 */}
        <div className="lg:col-span-4 flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-gray-900 tracking-tight">
            공통코드 목록
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleOpenAddGroup}
              className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm transition-colors">
              추가
            </button>
            <button
              type="button"
              onClick={handleOpenEditGroup}
              disabled={!selectedGroupCode}
              className="px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm transition-colors">
              수정
            </button>
            <button
              type="button"
              onClick={handleDeleteGroup}
              disabled={!selectedGroupCode}
              className="px-3 py-1.5 rounded-md bg-red-500 text-white text-xs font-semibold hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm transition-colors">
              삭제
            </button>
          </div>
        </div>

        {/* 우측 타이틀 & 액션 */}
        <div className="lg:col-span-8 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h2 className="text-[17px] font-bold text-gray-900 tracking-tight">
              상세코드 목록
            </h2>
            {currentGroup && (
              <span className="text-[15px] font-semibold text-gray-600">
                ({currentGroup.common_nm})
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleOpenAddDetail}
              disabled={!selectedGroupCode}
              className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm transition-colors">
              추가
            </button>
            <button
              type="button"
              onClick={handleOpenEditDetail}
              disabled={!selectedDetailCode}
              className="px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm transition-colors">
              수정
            </button>
            <button
              type="button"
              onClick={handleDeleteDetail}
              disabled={!selectedDetailCode}
              className="px-3 py-1.5 rounded-md bg-red-500 text-white text-xs font-semibold hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm transition-colors">
              삭제
            </button>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/*  그리드 본체 카드 (스크린샷과 동일한 라운드 박스 & AG Grid)            */}
      {/* -------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 좌측: 공통코드 목록 그리드 (col-span-4) */}
        <div className="lg:col-span-4 rounded-2xl border border-gray-200/90 bg-white p-3 shadow-xs">
          <div style={{ height: "calc(100vh - 350px)", minHeight: "480px" }}>
            <Grid
              gridRef={groupGridRef}
              rowData={groups as unknown as Array<Record<string, unknown>>}
              columnDefs={groupColumnDefs}
              height="100%"
              rowHeight={38}
              gridOptions={{
                onRowClicked: onGroupRowClicked,
                onGridReady: (params) => {
                  params.api?.sizeColumnsToFit();
                },
                onGridSizeChanged: (params) => {
                  params.api?.sizeColumnsToFit();
                },
                getRowStyle: (params) => {
                  if (params.data?.common_code === selectedGroupCode) {
                    return {
                      backgroundColor: "#e0f2fe", // 스크린샷과 동일한 연한 하늘색
                      outline: "1px solid #7dd3fc",
                      fontWeight: "600",
                    };
                  }
                  return undefined;
                },
              }}
            />
          </div>
        </div>

        {/* 우측: 상세코드 목록 그리드 (col-span-8) */}
        <div className="lg:col-span-8 rounded-2xl border border-gray-200/90 bg-white p-3 shadow-xs">
          <div style={{ height: "calc(100vh - 350px)", minHeight: "480px" }}>
            <Grid
              gridRef={detailGridRef}
              rowData={currentDetails as unknown as Array<Record<string, unknown>>}
              columnDefs={detailColumnDefs}
              height="100%"
              rowHeight={38}
              gridOptions={{
                onRowClicked: onDetailRowClicked,
                onGridReady: (params) => {
                  params.api?.sizeColumnsToFit();
                },
                onGridSizeChanged: (params) => {
                  params.api?.sizeColumnsToFit();
                },
                getRowStyle: (params) => {
                  if (params.data?.detail_code === selectedDetailCode) {
                    return {
                      backgroundColor: "#f1f5f9",
                      fontWeight: "600",
                    };
                  }
                  return undefined;
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/*  모달: 공통코드 추가/수정                                              */}
      {/* -------------------------------------------------------------------- */}
      <Dialog open={isGroupModalOpen} onOpenChange={setIsGroupModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900">
              {groupModalMode === "add" ? "공통코드 등록" : "공통코드 수정"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveGroup} className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                공통코드 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="예: OPER_ID"
                value={groupForm.common_code}
                onChange={(e) =>
                  setGroupForm((prev) => ({
                    ...prev,
                    common_code: e.target.value.toUpperCase(),
                  }))
                }
                disabled={groupModalMode === "edit"}
                required
                className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                공통코드명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="예: 기관ID"
                value={groupForm.common_nm}
                onChange={(e) =>
                  setGroupForm((prev) => ({ ...prev, common_nm: e.target.value }))
                }
                required
                className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <DialogFooter className="pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsGroupModalOpen(false)}
                className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-md bg-blue-600 text-sm text-white hover:bg-blue-700 transition-colors">
                저장
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------------------------------- */}
      {/*  모달: 상세코드 추가/수정                                              */}
      {/* -------------------------------------------------------------------- */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900">
              {detailModalMode === "add" ? "상세코드 등록" : "상세코드 수정"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveDetail} className="space-y-3.5 py-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                소속 공통코드
              </label>
              <input
                type="text"
                value={`${detailForm.common_code} (${currentGroup?.common_nm || ""})`}
                disabled
                className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm font-mono bg-gray-100 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                상세코드 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="예: CD001"
                value={detailForm.detail_code}
                onChange={(e) =>
                  setDetailForm((prev) => ({
                    ...prev,
                    detail_code: e.target.value.toUpperCase(),
                  }))
                }
                disabled={detailModalMode === "edit"}
                required
                className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">값1</label>
                <input
                  type="text"
                  placeholder="예: 2023-02-19"
                  value={detailForm.val_1 || ""}
                  onChange={(e) =>
                    setDetailForm((prev) => ({ ...prev, val_1: e.target.value }))
                  }
                  className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">값2</label>
                <input
                  type="text"
                  placeholder="예: 2023-02-19"
                  value={detailForm.val_2 || ""}
                  onChange={(e) =>
                    setDetailForm((prev) => ({ ...prev, val_2: e.target.value }))
                  }
                  className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">값3</label>
                <input
                  type="text"
                  placeholder="값3"
                  value={detailForm.val_3 || ""}
                  onChange={(e) =>
                    setDetailForm((prev) => ({ ...prev, val_3: e.target.value }))
                  }
                  className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">비고</label>
                <input
                  type="text"
                  placeholder="비고"
                  value={detailForm.remark || ""}
                  onChange={(e) =>
                    setDetailForm((prev) => ({ ...prev, remark: e.target.value }))
                  }
                  className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">사용여부</label>
                <select
                  value={detailForm.use_yn}
                  onChange={(e) =>
                    setDetailForm((prev) => ({
                      ...prev,
                      use_yn: e.target.value as "Y" | "N",
                    }))
                  }
                  className="w-full h-9 px-2 rounded-md border border-gray-300 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="Y">Y</option>
                  <option value="N">N</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  시스템코드유무
                </label>
                <select
                  value={detailForm.sys_yn}
                  onChange={(e) =>
                    setDetailForm((prev) => ({
                      ...prev,
                      sys_yn: e.target.value as "Y" | "N",
                    }))
                  }
                  className="w-full h-9 px-2 rounded-md border border-gray-300 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="Y">Y</option>
                  <option value="N">N</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-md bg-blue-600 text-sm text-white hover:bg-blue-700 transition-colors">
                저장
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 토스트 메시지 */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
      />
    </section>
  );
}
