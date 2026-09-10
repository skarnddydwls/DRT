import type { ColDef } from "ag-grid-community";

export const replacementVehicleColumnDefs: ColDef[] = [
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
    headerName: "대차일시",
    field: "replace_dtm",
    width: 180,
    maxWidth: 200,
    cellStyle: { textAlign: "center", color: "#222222" },
  },
  {
    headerName: "원차량 아이디",
    field: "origin_vehicle_id",
    width: 150,
    maxWidth: 180,
    cellStyle: { textAlign: "center", color: "#222222" },
  },
  {
    headerName: "대차차량 아이디",
    field: "replace_vehicle_id",
    width: 150,
    maxWidth: 180,
    cellStyle: { textAlign: "center", color: "#222222" },
  },
  {
    headerName: "대차 상태",
    field: "status",
    width: 120,
    maxWidth: 150,
    cellStyle: { textAlign: "center", color: "#222222" },
  },
  {
    headerName: "사유",
    field: "reason",
    flex: 1,
    minWidth: 250,
    maxWidth: 9999, // 끝까지 꽉 채우기!
    cellStyle: { textAlign: "left", color: "#222222" },
  },
];