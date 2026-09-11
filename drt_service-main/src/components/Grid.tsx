import { AgGridReact } from "ag-grid-react";
import { useMemo } from "react";
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
    }),
    [gridOptions]
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
        .ag-theme-alpine .ag-row:hover {
          background-color: #e5e7eb !important;
        }
      `}</style>
      <div
        className="ag-theme-alpine rounded-[24px] overflow-hidden w-full"
        data-enable-number-coloring={enableNumberColoring ? "1" : "0"}
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
          rowData={rowData}
          columnDefs={columnDefs}
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
        />
      </div>
    </>
  );
}
