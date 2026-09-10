import { formatTimestamp } from "@/lib/utils";

export const dispatchColumnDefs = [
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
  {
    headerName: "배차순번",
    field: "dispatch_seq",
    minWidth: 110,
  },
  {
    headerName: "정류장ID",
    field: "point_id",
    minWidth: 120,
  },
  {
    headerName: "노선ID",
    field: "route_id",
    minWidth: 120,
  },
  {
    headerName: "차량ID",
    field: "vehicle_id",
    minWidth: 120,
  },
  {
    headerName: "배차일시",
    field: "dispatch_dt",
    minWidth: 170,
    valueFormatter: (params: { value: number }) =>
      formatTimestamp(params.value, "YYYY-MM-DD HH:mm:ss"),
  },
  {
    headerName: "algh일시",
    field: "algh_dtm",
    minWidth: 170,
    valueFormatter: (params: { value: number }) =>
      formatTimestamp(params.value, "YYYY-MM-DD HH:mm:ss"),
  },
  {
    headerName: "비고",
    field: "remark",
    minWidth: 160,
  },
];
