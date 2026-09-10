import { formatTimestamp } from "@/lib/utils";

export const routeColumnDefs = [
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
    headerName: "노선명",
    field: "route_nm",
    minWidth: 150,
    flex: 1,
  },
  // { headerName: "권역", field: "area", minWidth: 80 },
  {
    headerName: "기점",
    field: "o_stn_nm",
    minWidth: 120,
    flex: 1.2,
  },
  {
    headerName: "종점",
    field: "d_stn_nm",
    minWidth: 120,
    flex: 1.2,
  },
  // { headerName: "상하행구분", field: "dir_cd", minWidth: 110 },
  {
    headerName: "적용시작일",
    field: "start_dt",
    minWidth: 120,
    flex: 1,
    cellStyle: { textAlign: "center" },
    valueFormatter: (params: { value: unknown }) =>
      formatTimestamp(params.value as number | string | null | undefined),
  },
  {
    headerName: "적용종료일",
    field: "end_dt",
    minWidth: 120,
    flex: 1,
    cellStyle: { textAlign: "center" },
    valueFormatter: (params: { value: unknown }) =>
      formatTimestamp(params.value as number | string | null | undefined),
  },
  {
    headerName: "비고",
    field: "remark",
    minWidth: 130,
    flex: 2.5,
  },
];
