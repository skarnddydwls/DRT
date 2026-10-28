import type { DispatchMasterRow } from '@/types/dispatchMaster';

/** 호차명으로 차량 ID를 추정하지 않고 마스터에 지정된 실제 차량을 사용한다. */
export function selectedRound(rows: readonly DispatchMasterRow[], routeId: string) {
  const selected = rows.filter(row => row.route_id === routeId);
  const name = selected[0]?.route_nm ?? '';
  const match = name.match(/(\d+)호차[_\s]+(\d+)/);
  const vehicles = [...new Set(selected.map(row => row.vehicle_id).filter((id): id is string => typeof id === 'string' && id.length > 0))];
  if (!selected.length || !match) throw new Error('호차·회차 정보를 확인해주세요.');
  if (vehicles.length !== 1) throw new Error('이 회차의 배차마스터에 차량이 없거나 여러 대가 지정되어 있습니다. 배차마스터를 확인해주세요.');
  return { sourceRouteId: routeId, routeName: name, roundNo: Number(match[2]), vehicleId: vehicles[0] };
}
