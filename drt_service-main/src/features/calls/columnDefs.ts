import { formatTimestamp } from "@/lib/utils";
import type { ColDef } from "ag-grid-community";
import type { CallRow } from "@/types/call";

export const callColumnDefs: ColDef<CallRow>[] = [
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
  // {
  //   headerName: "배차순번",
  //   field: "dispatch_seq",
  //   minWidth: 120,
  //   sortable: true,
  // },

  {
    headerName: "호출일시",
    field: "call_dtm",
    minWidth: 170,
  },
  {
    headerName: "예약상태",
    field: "rsv_status",
    minWidth: 140,
    valueFormatter: ({ value }) => ({ WAIT: "예약완료", DONE: "이용완료", CANCEL: "예약취소" } as Record<string, string>)[String(value)] ?? "상태 확인 필요",
    cellStyle: ({ value }) => ({ color: value === "CANCEL" ? "#dc2626" : value === "WAIT" ? "#2563eb" : "#475569", fontWeight: 600 }),
  },
  {
    headerName: "사용자 닉네임",
    field: "nickname",
    minWidth: 140,
    valueFormatter: ({ value }) => String(value ?? "").trim() || "미등록",
  },
  {
    headerName: "디바이스ID",
    field: "device_id",
    minWidth: 150,
  },
  {
    headerName: "노선명",
    field: "route_nm",
    minWidth: 140,
  },
  {
    headerName: "승차예정시각",
    field: "schedule_ride_dtm",
    minWidth: 170,
  },
  {
    headerName: "하차예정시각",
    field: "schedule_algh_dtm",
    minWidth: 170,
  },
  {
    headerName: "승차정류장",
    field: "start_point_nm",
    minWidth: 140,
  },
  {
    headerName: "하차정류장",
    field: "end_point_nm",
    minWidth: 140,
  },
  {
    headerName: "예약인원",
    field: "rsv_num",
    minWidth: 140,
  },
  // {
  //   headerName: "기존탑승인원",
  //   field: "curren_reserved",
  //   minWidth: 140,
  // },
  {
    headerName: "배차일자",
    field: "dispatch_dt",
    minWidth: 150,
    valueFormatter: (params: { value: unknown }) =>
      formatTimestamp(params.value as number | string | null | undefined),
  },
  {
    headerName: "위도",
    field: "gps_y",
    minWidth: 100,
  },
  {
    headerName: "경도",
    field: "gps_x",
    minWidth: 100,
  },
];
