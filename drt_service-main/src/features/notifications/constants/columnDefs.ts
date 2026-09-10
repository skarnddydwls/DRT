// features/notifications/columnDefs.ts
import type { ColDef } from "ag-grid-community";

export const notificationColumnDefs: ColDef[] = [
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
    headerName: "알림시각",
    field: "noti_dtm",
    width: 250,
    maxWidth: 250, // 시각 적정 폭 유지
    cellStyle: { textAlign: "center", color: "#222222" },
  },
  {
    headerName: "알림유형",
    field: "noti_type",
    width: 200,
    maxWidth: 200, // 유형 적정 폭 유지
    cellStyle: { textAlign: "center", color: "#222222" },
  },
  {
    headerName: "대상",
    field: "noti_target",
    width: 150,
    maxWidth: 150, // 대상 적정 폭 유지
    cellStyle: { textAlign: "center", color: "#222222" },
  },
  {
    headerName: "제목",
    field: "noti_title",
    width: 320,
    maxWidth: 320, // 제목 적정 폭 유지
    cellStyle: { textAlign: "center", color: "#222222" },
  },
  {
    headerName: "내용",
    field: "noti_content",
    flex: 1,
    minWidth: 300,
    maxWidth: 9999, 
    cellStyle: { textAlign: "left", color: "#222222" },
  },
];