"use client";

import { useState, type RefObject } from "react";
import type { GridApi } from "ag-grid-community";
import { Download } from "lucide-react";
import { currentGridCsv } from "@/lib/gridCsv";

export default function GridCsvButton({ gridRef, fileName, disabled = false }: {
  gridRef: RefObject<{ api?: GridApi } | null>;
  fileName: string;
  disabled?: boolean;
}) {
  const [error, setError] = useState("");
  const download = () => {
    setError("");
    const api = gridRef.current?.api;
    if (!api || api.isDestroyed() || !api.getDisplayedRowCount()) { setError("다운로드할 조회 결과가 없습니다."); return; }
    try {
      const csv = currentGridCsv(api);
      if (csv == null) throw new Error("CSV 생성 실패");
      const stamp = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(new Date()).replace(/[^0-9]/g, "");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${fileName}_${stamp}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("CSV 다운로드에 실패했습니다. 다시 시도해주세요.");
    }
  };
  return <div className="mb-3 flex items-center justify-end gap-3">
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <button type="button" disabled={disabled} onClick={download} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"><Download size={16} aria-hidden="true" />CSV 다운로드</button>
  </div>;
}
