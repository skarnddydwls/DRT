export const markerColumnDefs = [
  {
    headerName: " ",
    valueGetter: "node.rowIndex + 1",
    width: 30,
    flex: 0,
  },
  { headerName: "노드ID", field: "node_id", width: 120 },
  { headerName: "노드명", field: "node_nm", width: 150 },
  { headerName: "경도", field: "gps_x", minWidth: 120 },
  { headerName: "위도", field: "gps_y", minWidth: 120 },
];
