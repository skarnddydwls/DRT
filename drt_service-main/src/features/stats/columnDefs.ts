/**
 * 호출 통계 그리드 컬럼 정의
 */

export const statsColumnDefs = [
  {
    headerName: "번호",
    valueGetter: "node.rowIndex + 1",
    width: 100,
    minWidth: 100,
    maxWidth: 100,
    flex: 0,
    resizable: false,
    suppressSizeToFit: true,
  },
  //   {
  //     headerName: "노선 번호",
  //     field: "route_id",
  //     minWidth: 120,
  //     flex: 1,
  //   },
  {
    headerName: "노선 이름",
    field: "route_nm",
    minWidth: 150,
    flex: 2,
  },
  {
    headerName: "전체 호출",
    field: "total_calls",
    minWidth: 120,
    flex: 1,
    type: "numericColumn",
    cellStyle: { textAlign: "right" },
  },
  {
    headerName: "카드 호출",
    field: "card_calls",
    minWidth: 120,
    flex: 1,
    type: "numericColumn",
    cellStyle: { textAlign: "right" },
  },
  {
    headerName: "현금 호출",
    field: "cash_calls",
    minWidth: 120,
    flex: 1,
    type: "numericColumn",
    cellStyle: { textAlign: "right" },
  },
];
