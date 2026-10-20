"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColDef } from "ag-grid-community";
import Grid from "@/components/Grid";
import { post } from "@/lib/api/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type CodeRow = Record<string, unknown> & { common_code: string };
type CodeResponse = { codes: CodeRow[] };
type Editor = { kind: "common" | "detail"; action: "create" | "update" | "delete" };
type CodeForm = { common_code: string; common_code_name: string; detail_code: string; value_1: string; value_2: string; value_3: string; remark: string; use_yn: string };
const emptyForm: CodeForm = { common_code: "", common_code_name: "", detail_code: "", value_1: "", value_2: "", value_3: "", remark: "", use_yn: "Y" };

const groupColumns: ColDef[] = [
  { headerName: "공통코드", field: "common_code", minWidth: 170, flex: 1 },
  { headerName: "공통코드명", field: "common_code_name", minWidth: 180, flex: 1.2 },
  { headerName: "사용여부", field: "use_yn", width: 95 },
  { headerName: "값1", field: "value_1", width: 120 },
  { headerName: "값2", field: "value_2", width: 120 },
  { headerName: "값3", field: "value_3", width: 120 },
  { headerName: "비고", field: "remark", width: 180 },
];
const detailColumns: ColDef[] = [
  { headerName: "상세코드", field: "detail_code", width: 120 },
  { headerName: "값1", field: "label", minWidth: 140, flex: 1 },
  { headerName: "값2", field: "value", minWidth: 130, flex: 1, cellRenderer: ({ value }: { value?: string }) => (
    <span className="inline-flex items-center gap-2">
      {typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) && <span className="inline-block h-3 w-3 rounded border" style={{ backgroundColor: value }} />}
      {value}
    </span>
  ) },
  { headerName: "값3", field: "value_3", minWidth: 100, flex: 1 },
  { headerName: "사용여부", field: "use_yn", width: 95 },
  { headerName: "비고", field: "remark", minWidth: 150, flex: 1.2 },
];

export default function CommonCodePage() {
  const groupGridRef = useRef(null);
  const detailGridRef = useRef(null);
  const [groups, setGroups] = useState<CodeRow[]>([]);
  const [details, setDetails] = useState<CodeRow[]>([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [groupError, setGroupError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [revision, setRevision] = useState(0);
  const [selectedDetail, setSelectedDetail] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [form, setForm] = useState<CodeForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [saveError, setSaveError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleteNotice, setDeleteNotice] = useState("");
  const [checkingDelete, setCheckingDelete] = useState(false);
  const checkingDeleteRef = useRef(false);
  const currentGroup = useMemo(() => groups.find((row) => row.common_code === selectedCode), [groups, selectedCode]);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const currentDetail = details.find((row) => row.detail_code === selectedDetail);
  const busy = saving || loadingGroups || loadingDetails || checkingDelete;
  const openEditor = async (kind: Editor["kind"], action: Editor["action"], targetRow?: CodeRow) => {
    if (checkingDeleteRef.current || savingRef.current) return;
    const row = targetRow ?? (kind === "common" ? currentGroup : currentDetail);
    if (action !== "create" && !row) return;
    if (kind === "common" && action === "delete" && row) {
      checkingDeleteRef.current = true;
      setCheckingDelete(true);
      try {
        const response = await post<CodeResponse>("/api/detail-code", { COMMON_CODE: row.common_code });
        if (response.codes.length > 0) {
          setDeleteNotice(`공통코드 [${row.common_code}]에 하위 상세코드가 ${response.codes.length}건 있습니다. 상세코드를 먼저 삭제해주세요.`);
          return;
        }
      } catch {
        setDeleteNotice("하위 상세코드 여부를 확인하지 못했습니다. 삭제하지 않았습니다. 잠시 후 다시 시도해주세요.");
        return;
      } finally {
        checkingDeleteRef.current = false;
        setCheckingDelete(false);
      }
    }
    setForm(action === "create" ? { ...emptyForm, common_code: kind === "detail" ? selectedCode : "" } : {
      common_code: String(row?.common_code ?? ""), common_code_name: String(row?.common_code_name ?? ""), detail_code: String(row?.detail_code ?? ""),
      value_1: String(row?.value_1 ?? row?.label ?? ""), value_2: String(row?.value_2 ?? row?.value ?? ""), value_3: String(row?.value_3 ?? ""),
      remark: String(row?.remark ?? ""), use_yn: String(row?.use_yn ?? "Y"),
    });
    setSaveError("");
    setEditor({ kind, action });
  };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError("");
    try {
      const response = await fetch("/api/common-code/manage", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...editor, ...form }),
      });
      const result = await response.json();
      if (!response.ok || result.success !== true) throw new Error(result.error || "코드 변경에 실패했습니다.");
      setNotice(`${editor.kind === "common" ? "공통코드" : "상세코드"}가 ${editor.action === "create" ? "등록" : editor.action === "update" ? "수정" : "삭제"}되었습니다.`);
      if (editor.kind === "common" && editor.action === "create") setSelectedCode(form.common_code.trim());
      setSelectedDetail("");
      setEditor(null);
      refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "코드 변경에 실패했습니다.";
      if (editor.kind === "common" && editor.action === "delete" && message.includes("상세코드")) {
        setEditor(null);
        setDeleteNotice(message);
      } else setSaveError(message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  const actions = (kind: Editor["kind"]) => <div className="flex gap-2">
    <button type="button" disabled={busy || (kind === "detail" && !currentGroup)} onClick={() => openEditor(kind, "create")} className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">추가</button>
    <button type="button" disabled={busy || !(kind === "common" ? currentGroup : currentDetail)} onClick={() => openEditor(kind, "update")} className="rounded bg-gray-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">수정</button>
    <button type="button" disabled={busy || !(kind === "common" ? currentGroup : currentDetail)} onClick={() => openEditor(kind, "delete")} className="rounded bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">삭제</button>
  </div>;

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      setLoadingGroups(true);
      setGroupError("");
      setDetails([]);
    });
    post<CodeResponse>("/api/common-code", {}).then(({ codes }) => {
      if (!active) return;
      setGroups(codes);
      setSelectedCode((previous) => codes.some((row) => row.common_code === previous) ? previous : codes[0]?.common_code ?? "");
    }).catch((error: unknown) => {
      if (!active) return;
      setGroups([]);
      setSelectedCode("");
      setGroupError(error instanceof Error ? error.message : "공통코드를 불러오지 못했습니다.");
    }).finally(() => { if (active) setLoadingGroups(false); });
    return () => { active = false; };
  }, [revision]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      setDetails([]);
      setDetailError("");
      setLoadingDetails(Boolean(selectedCode));
    });
    if (selectedCode) {
      post<CodeResponse>("/api/detail-code", { COMMON_CODE: selectedCode }).then(({ codes }) => {
        if (active) setDetails(codes.filter((row) => row.common_code === selectedCode));
      }).catch((error: unknown) => {
        if (active) setDetailError(error instanceof Error ? error.message : "상세코드를 불러오지 못했습니다.");
      }).finally(() => { if (active) setLoadingDetails(false); });
    }
    return () => { active = false; };
  }, [selectedCode, revision]);

  return (
    <section className="common-code-page">
      <style>{`.common-code-page .ag-theme-alpine .ag-row.common-code-selected { background-color: #e0f2fe !important; font-weight: 600; }`}</style>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">공통코드 관리</h1>
          <p className="mt-1 text-sm text-gray-500">왼쪽 공통코드를 선택하면 해당 COMMON_CODE에 속한 상세코드를 오른쪽에 표시합니다.</p>
        </div>
        <button type="button" onClick={refresh} disabled={busy} className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">새로고침</button>
      </div>
      {notice && <p role="status" className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">{notice}</p>}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="min-w-0 rounded-xl border bg-white p-4 lg:col-span-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">공통코드 <span className="text-sm font-normal text-gray-500">{groups.length}건</span></h2>{actions("common")}</div>
          <p className="mb-3 text-xs text-gray-500">CMM_COMMON_CODE · Parent</p>
          {groupError && <p role="alert" className="mb-3 text-sm text-red-700">{groupError}</p>}
          {loadingGroups && <p role="status" className="mb-3 text-sm text-gray-500">공통코드 조회 중...</p>}
          <Grid gridRef={groupGridRef} rowData={groups} columnDefs={groupColumns} height="calc(100vh - 350px)" rowHeight={40} gridOptions={{
            getRowId: ({ data }) => String(data.common_code),
            rowClassRules: { "common-code-selected": ({ data }) => data?.common_code === selectedCode },
            onRowClicked: ({ data }) => { if (!busy && data?.common_code && data.common_code !== selectedCode) { setDetails([]); setSelectedDetail(""); setSelectedCode(String(data.common_code)); } },
            onRowDoubleClicked: ({ data }) => {
              if (!data?.common_code || saving || checkingDelete || loadingGroups) return;
              if (data.common_code !== selectedCode) { setDetails([]); setSelectedDetail(""); setSelectedCode(String(data.common_code)); }
              void openEditor("common", "update", data as CodeRow);
            },
            getRowStyle: ({ data }) => data?.common_code === selectedCode ? { backgroundColor: "#e0f2fe", fontWeight: "600" } : undefined,
            overlayNoRowsTemplate: "조회된 공통코드가 없습니다.",
          }} />
        </div>
        <div className="min-w-0 rounded-xl border bg-white p-4 lg:col-span-7">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">상세코드 <span className="text-sm font-normal text-gray-500">{details.length}건</span></h2>{actions("detail")}</div>
          <p className="mb-3 text-xs text-gray-500">CMM_DETAIL_CODE · Child {currentGroup ? `— ${selectedCode} / ${String(currentGroup.common_code_name ?? "")}` : "— 공통코드를 선택해주세요"}</p>
          {detailError && <p role="alert" className="mb-3 text-sm text-red-700">{detailError}</p>}
          {loadingDetails && <p role="status" className="mb-3 text-sm text-gray-500">상세코드 조회 중...</p>}
          <Grid gridRef={detailGridRef} rowData={details} columnDefs={detailColumns} height="calc(100vh - 350px)" rowHeight={40} gridOptions={{
            getRowId: ({ data }) => JSON.stringify([data.common_code, data.detail_code]),
            onRowClicked: ({ data }) => { if (!busy && data?.detail_code) setSelectedDetail(String(data.detail_code)); },
            onRowDoubleClicked: ({ data }) => {
              if (busy || !data?.detail_code || data.common_code !== selectedCode) return;
              setSelectedDetail(String(data.detail_code));
              void openEditor("detail", "update", data as CodeRow);
            },
            rowClassRules: { "common-code-selected": ({ data }) => data?.detail_code === selectedDetail },
            overlayNoRowsTemplate: selectedCode ? "등록된 상세코드가 없습니다." : "왼쪽 공통코드를 선택해주세요.",
          }} />
        </div>
      </div>
      <Dialog open={Boolean(deleteNotice)} onOpenChange={(open) => { if (!open) setDeleteNotice(""); }}>
        <DialogContent className="w-[min(94vw,440px)]">
          <DialogHeader><DialogTitle>공통코드 삭제 불가</DialogTitle></DialogHeader>
          <p className="my-5 text-sm leading-relaxed">{deleteNotice}</p>
          <DialogFooter><button type="button" onClick={() => setDeleteNotice("")} className="rounded bg-blue-600 px-4 py-2 text-white">확인</button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={editor !== null} onOpenChange={(open) => { if (!open && !savingRef.current) setEditor(null); }}>
        <DialogContent className="w-[min(94vw,540px)] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editor?.kind === "common" ? "공통코드" : "상세코드"} {editor?.action === "create" ? "추가" : editor?.action === "update" ? "수정" : "삭제"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="mt-4 space-y-4">
            {editor?.action === "delete" ? <div className="space-y-2 text-sm">
              <p><strong>{form.common_code}{editor.kind === "detail" ? ` / ${form.detail_code}` : ""}</strong> 코드를 삭제하시겠습니까?</p>
              <p className="text-gray-500">{editor.kind === "common" ? "상세코드가 있는 공통코드는 삭제할 수 없습니다." : "삭제 후 다른 화면에서 이 코드를 선택할 수 없게 됩니다."}</p>
            </div> : <>
              <label className="block text-sm">공통코드 *<input required maxLength={20} disabled={saving || editor?.kind === "detail" || editor?.action === "update"} value={form.common_code} onChange={(e) => setForm({ ...form, common_code: e.target.value })} className="mt-1 w-full rounded border p-2 disabled:bg-gray-100" /></label>
              {editor?.kind === "common" ? <label className="block text-sm">공통코드명 *<input required maxLength={50} disabled={saving} value={form.common_code_name} onChange={(e) => setForm({ ...form, common_code_name: e.target.value })} className="mt-1 w-full rounded border p-2" /></label> : <label className="block text-sm">상세코드 *<input required maxLength={5} disabled={saving || editor?.action === "update"} value={form.detail_code} onChange={(e) => setForm({ ...form, detail_code: e.target.value })} className="mt-1 w-full rounded border p-2 disabled:bg-gray-100" /></label>}
              {(["value_1", "value_2", "value_3", "remark"] as const).map((key, index) => <label key={key} className="block text-sm">{key === "remark" ? "비고" : `값${index + 1}`}<input maxLength={200} disabled={saving} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="mt-1 w-full rounded border p-2" /></label>)}
              <label className="block text-sm">사용여부<select disabled={saving} value={form.use_yn} onChange={(e) => setForm({ ...form, use_yn: e.target.value })} className="mt-1 w-full rounded border p-2"><option value="Y">사용 (Y)</option><option value="N">미사용 (N)</option></select></label>
            </>}
            {saveError && <p role="alert" className="text-sm text-red-700">{saveError}</p>}
            <DialogFooter><button type="button" disabled={saving} onClick={() => setEditor(null)} className="rounded border px-4 py-2">취소</button><button type="submit" disabled={saving} className={`rounded px-4 py-2 text-white disabled:opacity-50 ${editor?.action === "delete" ? "bg-red-600" : "bg-blue-600"}`}>{saving ? "처리 중..." : editor?.action === "delete" ? "삭제" : "저장"}</button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
