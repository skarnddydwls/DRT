import { formatTimestamp } from '@/lib/utils';
export function DispatchTransferBadge({ enabled, minutes = 3, time }: { enabled?: boolean; minutes?: number; time: number | string | null }) {
  if (!enabled) return null;
  const timestamp = Number(time);
  const ready = Number.isFinite(timestamp) && timestamp > 0 ? formatTimestamp(timestamp + minutes * 60000, 'HH:mm') : '';
  return <span aria-label={`환승 허용, 이동·탑승 ${minutes}분${ready ? `, ${ready} 이후 탑승` : ''}`} title={`다른 호차로 이동·탑승 ${minutes}분 포함${ready ? ` · ${ready} 이후 탑승` : ''}`} className="absolute bottom-2 right-2 rounded bg-purple-100 px-1 text-[9px] leading-3 font-bold text-purple-700">
    환승
  </span>;
}
