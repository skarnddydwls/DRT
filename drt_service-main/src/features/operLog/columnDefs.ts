import { formatTimestamp } from "@/lib/utils";

export const operLogColumnDefs = [
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
    headerName: "운행일시",
    field: "oper_dtm",
    minWidth: 170,
    valueFormatter: (params: { value: unknown }) =>
      formatTimestamp(
        params.value as number | string | null | undefined,
        "YYYY-MM-DD HH:mm:ss"
      ),
  },
  {
    headerName: "노선명",
    field: "route_nm",
    minWidth: 140,
  },
  {
    headerName: "차량번호",
    field: "vehicle_no",
    minWidth: 140,
  },
  // {
  //   headerName: "차량ID",
  //   field: "vehicle_id",
  //   minWidth: 140,
  // },
  {
    headerName: "속도(km/h)",
    field: "speed",
    minWidth: 120,
    valueFormatter: (params: { value: number }) =>
      params.value != null ? (Number(params.value) * 3.6).toFixed(2) : "",
  },
  {
    headerName: "방위각",
    field: "heading",
    minWidth: 100,
  },
  {
    headerName: "위도",
    field: "gps_x",
    minWidth: 140,
  },
  {
    headerName: "경도",
    field: "gps_y",
    minWidth: 140,
  },
  {
    headerName: "배차일자",
    field: "dispatch_dt",
    minWidth: 160,
    valueFormatter: (params: { value: unknown }) =>
      formatTimestamp(
        params.value as number | string | null | undefined,
        "YYYY-MM-DD"
      ),
  },
];
