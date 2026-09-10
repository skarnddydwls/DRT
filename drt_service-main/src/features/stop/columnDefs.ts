import { formatTimestamp } from "@/lib/utils";

export const stopColumnDefs = [
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
  { headerName: "정류장명", field: "stn_nm", minWidth: 140, sortable: true },
  { headerName: "방향", field: "direction", minWidth: 120, sortable: true },
  { headerName: "정류장번호", field: "stn_no", minWidth: 140 },

  { headerName: "위도", field: "gps_y", minWidth: 100 },
  { headerName: "경도", field: "gps_x", minWidth: 100 },
  {
    headerName: "적용시작일",
    field: "start_dt",
    minWidth: 140,
    valueFormatter: (params: { value: unknown }) =>
      formatTimestamp(params.value as number | string | null | undefined),
  },
  {
    headerName: "적용종료일",
    field: "end_dt",
    minWidth: 140,
    valueFormatter: (params: { value: unknown }) =>
      formatTimestamp(params.value as number | string | null | undefined),
  },
  { headerName: "정류장형태", field: "stn_type", minWidth: 110 },
  { headerName: "비고", field: "remark", minWidth: 150 },
];
