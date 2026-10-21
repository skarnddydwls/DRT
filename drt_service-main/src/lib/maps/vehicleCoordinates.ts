/** Vehicle API follows WGS84: GPS_X=longitude, GPS_Y=latitude. */
export function vehicleCoordinates(row: { gps_x?: unknown; gps_y?: unknown }): [number, number] | null {
  if (row.gps_x == null || row.gps_y == null || String(row.gps_x).trim() === "" || String(row.gps_y).trim() === "") return null;
  const longitude = Number(row.gps_x);
  const latitude = Number(row.gps_y);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || Math.abs(longitude) > 180 || Math.abs(latitude) > 90) return null;
  return [longitude, latitude];
}
