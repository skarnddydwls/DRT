import type { ColDef } from "ag-grid-community";

export const cancellationColumnDefs: ColDef[] = [
  {
    headerName: "번호",
    valueGetter: "node.rowIndex + 1",
    width: 100,
    minWidth: 100,
    maxWidth: 100,
    suppressSizeToFit: true,
    cellStyle: { textAlign: "center", color: "#222222" },
  },
  {
    headerName: "최초 확인시각",
    field: "cancel_dtm",
    width: 170,
    maxWidth: 190,
    cellStyle: { textAlign: "center", color: "#222222" },
  },
  {
    headerName: "운행예정시각",
    field: "plan_dtm",
    width: 170,
    maxWidth: 190,
    cellStyle: { textAlign: "center", color: "#222222" },
  },
  {
    headerName: "선박명",
    field: "ship_nm",
    width: 150,
    maxWidth: 180,
    cellStyle: { textAlign: "center", color: "#222222" },
  },
  {
    headerName: "출발항",
    field: "start_port_nm",
    width: 130,
    maxWidth: 150,
    cellStyle: { textAlign: "center", color: "#222222" },
  },
  {
    headerName: "도착항",
    field: "end_port_nm",
    width: 130,
    maxWidth: 150,
    cellStyle: { textAlign: "center", color: "#222222" },
  },
  {
    headerName: "운항구분",
    field: "operation_div_nm",
    width: 110,
  },
  {
    headerName: "결항사유",
    field: "cancel_reason",
    flex: 1,
    minWidth: 200,
    maxWidth: 9999, // 끝까지 꽉 채우기!
    cellStyle: { textAlign: "left", color: "#222222" },
  },
];
