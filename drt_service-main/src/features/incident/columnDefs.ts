// features/incidents/columnDefs.ts

export const incidentColumnDefs = [
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
    headerName: "발생일시",
    field: "occurred_dtm",
    width: 200,
    cellStyle: { textAlign: "center", color: "#222222" },
  },
  {
    headerName: "차량번호",
    field: "vehicle_no",
    width: 160,
    cellStyle: { textAlign: "center", color: "#222222" },
  },
  {
    headerName: "유고 종류",
    field: "incident_type",
    width: 140,
    cellStyle: { textAlign: "center", color: "#222222" },
  },
  {
    headerName: "GPS_X",
    field: "longitude",
    width: 140,
    cellStyle: { textAlign: "center", color: "#222222" },
  },
  {
    headerName: "GPS_Y",
    field: "latitude",
    width: 140,
    cellStyle: { textAlign: "center", color: "#222222" },
  },
  {
    headerName: "상세설명",
    field: "description",
    flex: 1,
    minWidth: 180,
    cellStyle: { textAlign: "center", color: "#222222" },
  },
];
