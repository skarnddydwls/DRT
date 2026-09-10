import { AgGridReact } from "ag-grid-react";
import {useMemo} from "react";
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
  height?: number | string; // 높이 props 추가
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

  const mergedDefaultColDef = useMemo(() => ({
    sortable: false,
    filter: false,
    resizable: true,
    suppressMovable: true,
    minWidth: 80,
    ...gridOptions.defaultColDef,
  }), [gridOptions.defaultColDef]);

  const computedGridOptions = useMemo(() => ({
    ...gridOptions,
    theme: "legacy" as const,
  }), [gridOptions]);


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
      `}</style>
      <div
        className="ag-theme-alpine"
        data-enable-number-coloring={enableNumberColoring ? "1" : "0"}
        style={{
          height,
          ["--ag-header-row-border" as string]: "1px solid #363636",
          ["--ag-wrapper-border" as string]: "transparent",
          ["--ag-wrapper-border-radius" as string]: "24px",
          ["--ag-header-background-color" as string]: "#fff",
        }}>
        <AgGridReact
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          pinnedBottomRowData={pinnedBottomRowData}
          // 기본 그리드 옵션
          rowHeight={rowHeight}
          suppressRowClickSelection={true} // 행 클릭 선택 비활성화
          suppressCellFocus={true} // 셀 포커스 비활성화
          suppressRowHoverHighlight={false} // 행 호버 하이라이트 허용
          localeText={{
            noRowsToShow: "조회된 결과가 없습니다. 조회를 진행해주세요",
          }}
          // 컬럼 공통 동작 정의(유연 채우기 + 확장 상한)
          defaultColDef={mergedDefaultColDef}
          // AG Grid v33+ legacy theming support
          {...gridOptions}
          gridOptions={computedGridOptions} 
        />
      </div>
    </>
  );
}
