export type TourismStop = {
  stn_id: string; stn_nm: string; stn_no?: string | null; direction?: string | null;
  gps_x?: number | string | null; gps_y?: number | string | null;
};

/** The API supplies active stops only. Same-name directions are one management group. */
export function groupTourismStops(stops: readonly TourismStop[]): TourismStop[] {
  const groups = new Map<string, TourismStop[]>();
  for (const stop of stops) {
    const name = stop.stn_nm.trim();
    if (!name) continue;
    const members = groups.get(name) ?? [];
    if (!members.some(member => member.stn_id === stop.stn_id)) members.push(stop);
    groups.set(name, members);
  }
  return [...groups].map(([name, members]) => {
    const representative = [...members].sort((a, b) => a.stn_id.localeCompare(b.stn_id))[0]!;
    const numbers = [...new Set(members.map(stop => stop.stn_no).filter(Boolean))];
    return {
      ...representative, stn_nm: name,
      direction: members.length > 1 ? '양방향 공통' : representative.direction,
      stn_no: numbers.length ? numbers.join(', ') : null,
    };
  });
}
