export function DispatchTransferBadge({ enabled, code, side }: { enabled?: boolean; code?: string | null; side?: string | null }) {
  if (!enabled) return null;
  return <span aria-label={`환승 ${code ? `${code} ${side}` : '코드 미지정'}`} title={`${code ? `${code} · ${side} · 같은 시각 또는 이후 배차로 환승 가능` : '코드 미지정: 예약 환승에 연결되지 않습니다.'}`} className="absolute bottom-2 right-2 rounded bg-purple-100 px-1 text-[9px] leading-3 font-bold text-purple-700">
    환승
  </span>;
}
