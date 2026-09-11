import { AgGridReact } from "ag-grid-react";
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import {
  ModuleRegistry,
  AllCommunityModule,
  type ColDef,
  type ColGroupDef,
  type GridOptions,
} from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

// Register AG Grid Community modules once
ModuleRegistry.registerModules([AllCommunityModule]);

interface GridProps {
  rowData: Array<Record<string, unknown>>;
  columnDefs: Array<ColDef | ColGroupDef>;
  pinnedBottomRowData?: Array<Record<string, unknown>>;
  gridRef: React.RefObject<AgGridReact<Record<string, unknown>> | null>;
  gridOptions?: GridOptions;
  height?: number | string; // 높이 props
  enableNumberColoring?: boolean; // 숫자 색상 적용 여부
  rowHeight?: number;
}

export default function Grid({
  rowData,
  columnDefs,
  pinnedBottomRowData,
  gridRef,
  gridOptions = {},
  height = "100%", // 기본값
  enableNumberColoring = false, // 기본값
  rowHeight = 35,
}: GridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [minRowCount, setMinRowCount] = useState<number>(15);

  // 컨테이너 크기 변경 감지하여 빈 공간을 채울 최소 행 개수 자동 계산
  useEffect(() => {
    if (!containerRef.current) return;
    const updateCount = () => {
      if (!containerRef.current) return;
      const clientHeight = containerRef.current.clientHeight;
      if (clientHeight > 0) {
        const pinnedHeight = (pinnedBottomRowData?.length || 0) * rowHeight;
        const availableHeight = clientHeight - 38 - pinnedHeight; // 헤더 높이 약 38px 차감
        const count = Math.max(1, Math.ceil(availableHeight / rowHeight));
        setMinRowCount(count);
      }
    };

    updateCount();
    const observer = new ResizeObserver(updateCount);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [rowHeight, pinnedBottomRowData?.length]);

  // 빈 공간을 채울 고스트 행 패딩 (실제 DOM 요소로 생성하여 세로선 및 너비 완벽 일치)
  const displayRowData = useMemo(() => {
    const targetCount = Math.max(minRowCount, rowData.length);
    if (rowData.length >= targetCount) return rowData;

    const ghostCount = targetCount - rowData.length;
    const ghostRows: Array<Record<string, unknown>> = Array.from(
      { length: ghostCount },
      (_, i) => ({
        __isGhost: true,
        __ghostId: `ghost-${i}`,
      })
    );

    return [...rowData, ...ghostRows];
  }, [rowData, minRowCount]);

  const hasGhost = useMemo(() => {
    return displayRowData.some((r) => r.__isGhost);
  }, [displayRowData]);

  // 고스트 행에서는 "번호" 열의 rowIndex 계산이나 커스텀 렌더러가 빈칸으로 나오도록 래핑
  const processedColumnDefs = useMemo(() => {
    const wrapCol = (col: ColDef | ColGroupDef): ColDef | ColGroupDef => {
      if ("children" in col && Array.isArray(col.children)) {
        return {
          ...col,
          children: col.children.map(wrapCol),
        };
      }
      const c = col as ColDef;
      const originalFormatter = c.valueFormatter;
      const originalRenderer = c.cellRenderer;

      return {
        ...c,
        valueFormatter: (params: any) => {
          if (params.data?.__isGhost) return "";
          if (typeof originalFormatter === "function") return originalFormatter(params);
          return params.value;
        },
        ...(originalRenderer
          ? {
              cellRenderer: (params: any) => {
                if (params.data?.__isGhost) return null;
                if (typeof originalRenderer === "function") return originalRenderer(params);
                return originalRenderer;
              },
            }
          : {}),
      };
    };

    return columnDefs.map(wrapCol);
  }, [columnDefs]);

  // 행 클릭 이벤트에서 고스트 행 클릭은 차단
  const handleRowClicked = useCallback(
    (event: any) => {
      if (event.data?.__isGhost) return;
      gridOptions.onRowClicked?.(event);
    },
    [gridOptions.onRowClicked]
  );

  // 고스트 행 클래스 주입
  const getRowClass = useCallback(
    (params: any) => {
      let classes = "";
      if (params.data?.__isGhost) {
        classes += "ag-ghost-row";
      }
      if (gridOptions.getRowClass) {
        const parentClass =
          typeof gridOptions.getRowClass === "function"
            ? gridOptions.getRowClass(params)
            : gridOptions.getRowClass;
        if (parentClass) classes += ` ${parentClass}`;
      }
      return classes.trim();
    },
    [gridOptions.getRowClass]
  );

  // 공통 기본 컬럼 설정: 최소 너비 유지, 과도한 확장 방지, 필요 시 가로 스크롤 허용
  const mergedDefaultColDef = useMemo(
    () => ({
      sortable: false,
      filter: false,
      resizable: true,
      suppressMovable: true,
      minWidth: 80,
      ...gridOptions.defaultColDef,
    }),
    [gridOptions.defaultColDef]
  );

  const computedGridOptions = useMemo(
    () => ({
      ...gridOptions,
      theme: "legacy" as const,
      getRowClass,
      onRowClicked: handleRowClicked,
    }),
    [gridOptions, getRowClass, handleRowClicked]
  );

  return (
    <>
      <style>{`
        .ag-theme-alpine .ag-header-cell-comp-wrapper {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          height: 100% !important;
          width: 100% !important;
        }

        /* 1. 기본 행 테두리 및 짝수행(흰색) / 홀수행(회색 #f1f3f5) 교차 줄무늬(Zebra Striping) */
        .ag-theme-alpine .ag-row {
          border-bottom: 1px solid #e5e7eb !important;
        }
        .ag-theme-alpine .ag-row.ag-row-even {
          background-color: #ffffff !important;
        }
        .ag-theme-alpine .ag-row.ag-row-odd {
          background-color: #f1f3f5 !important; /* 컬럼 헤더와 동일한 깔끔한 라이트 그레이 */
        }

        /* 2. 세로선은 회색보다 좀 더 진한 회색(#d1d5db)으로 명확하게 처리 */
        .ag-theme-alpine .ag-cell {
          border-right: 1px solid #d1d5db !important;
        }
        .ag-theme-alpine .ag-cell:last-child {
          border-right: 0 !important;
        }

        /* 3. 실제 데이터 행 호버 효과 */
        .ag-theme-alpine .ag-row:not(.ag-ghost-row):hover {
          background-color: #e5e7eb !important;
        }

        /* 4. 고스트 행(빈 공간 채움 행) 상호작용 차단 */
        .ag-theme-alpine .ag-row.ag-ghost-row {
          pointer-events: none !important;
          cursor: default !important;
          user-select: none !important;
        }

        /* 5. 고스트 행이 활성화되어 뷰포트를 채웠을 때는 불필요한 세로 스크롤바 감춤 */
        .ag-theme-alpine[data-has-ghost="1"] .ag-body-vertical-scroll {
          display: none !important;
          width: 0 !important;
        }
        .ag-theme-alpine[data-has-ghost="1"] .ag-body-vertical-scroll-viewport {
          display: none !important;
          width: 0 !important;
        }

        /* 6. 데이터 없을 때 안내 문구 깔끔한 플로팅 카드 */
        .ag-theme-alpine .ag-overlay-no-rows-center {
          background-color: #ffffff !important;
          padding: 16px 28px !important;
          border-radius: 12px !important;
          border: 1px solid #e2e8f0 !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05) !important;
          color: #64748b !important;
          font-weight: 500 !important;
        }
      `}</style>
      <div
        ref={containerRef}
        className="ag-theme-alpine relative rounded-[24px] overflow-hidden w-full"
        data-enable-number-coloring={enableNumberColoring ? "1" : "0"}
        data-has-ghost={hasGhost ? "1" : "0"}
        style={{
          height,
          width: "100%",
          ["--ag-row-border-color" as string]: "#e5e7eb",
          ["--ag-border-color" as string]: "#d1d5db",
          ["--ag-header-row-border" as string]: "1px solid #d1d5db",
          ["--ag-wrapper-border" as string]: "transparent",
          ["--ag-wrapper-border-radius" as string]: "24px",
          ["--ag-header-background-color" as string]: "#f1f3f5",
          ["--ag-header-foreground-color" as string]: "#1e293b",
        }}>
        <AgGridReact
          ref={gridRef}
          rowData={displayRowData}
          columnDefs={processedColumnDefs}
          pinnedBottomRowData={pinnedBottomRowData}
          rowHeight={rowHeight}
          suppressRowClickSelection={true}
          suppressCellFocus={true}
          suppressRowHoverHighlight={false}
          localeText={{
            noRowsToShow: "조회된 결과가 없습니다. 조회를 진행해주세요",
          }}
          defaultColDef={mergedDefaultColDef}
          {...gridOptions}
          gridOptions={computedGridOptions}
          getRowClass={getRowClass}
          onRowClicked={handleRowClicked}
        />
        {/* 실제 데이터가 0건일 때, 격자 줄무늬 위에 깔끔하게 띄우는 안내 오버레이 */}
        {rowData.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="bg-white/95 px-6 py-4 rounded-xl border border-slate-200 shadow-md text-slate-500 font-medium">
              {gridOptions.localeText?.noRowsToShow || "조회된 결과가 없습니다. 조회를 진행해주세요"}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
