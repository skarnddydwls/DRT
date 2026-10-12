"use client";
import { useEffect, useState } from "react";
import { ArrowRightLeft, Info, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { post } from "@/lib/api/client";
export interface TransferSetting { transfer_enabled?: boolean; transfer_minutes?: number }
export function DispatchTransferDialog({ open, onClose, target, onSaved }: {
  open: boolean; onClose: () => void;
  target: (TransferSetting & { dispatch_id?: string; dispatch_dt?: string; device_id?: string; route_id: string; point_id: string; dispatch_seq: number; label: string }) | null;
  onSaved: (settings: TransferSetting) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if(open) { setError(''); } }, [open, target]);
  const save = async () => {
    if (!target || saving) return;
    setSaving(true); setError('');
    try {
      const settings = { transfer_enabled: true, transfer_minutes: 3 };
      const result = await post<{ success: boolean }>('/api/dispatch-transfer', { ...target, ...settings });
      if (!result.success) throw new Error('선택한 배차를 다시 조회해주세요.');
      onSaved(settings); onClose();
    } catch { setError('환승 설정을 저장하지 못했습니다. 다시 시도해주세요.'); }
    finally { setSaving(false); }
  };
  const selectedTime = target?.label.match(/(\d{2}):(\d{2})$/);
  const duration = 3;
  const readyMinutes = selectedTime ? Number(selectedTime[1]) * 60 + Number(selectedTime[2]) + duration : null;
  const readyTime = readyMinutes === null ? null : `${String(Math.floor(readyMinutes / 60) % 24).padStart(2, '0')}:${String(readyMinutes % 60).padStart(2, '0')}`;
  return <Dialog open={open} onOpenChange={(value) => { if (!value && !saving) onClose(); }}><DialogContent showCloseButton={!saving} style={{ padding: 0, borderRadius: 16 }} className="flex max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-[520px] flex-col overflow-hidden border-slate-200 bg-white shadow-2xl">
    <DialogHeader style={{ marginBottom: 0, textAlign: 'left' }} className="bg-gradient-to-br from-violet-50 via-white to-white px-6 pb-2 pt-6">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-sm"><ArrowRightLeft className="size-5" aria-hidden="true" /></div>
        <div><p className="mb-1 text-[10px] font-bold tracking-widest text-violet-600">운행 연결 관리</p><DialogTitle className="text-xl font-bold text-slate-900">환승 설정</DialogTitle></div>
      </div>
      <DialogDescription className="text-xs text-slate-500">다른 호차 환승을 허용하고 이동·탑승 여유 시간은 기본 3분으로 적용합니다.</DialogDescription>
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-violet-100 bg-white/80 px-3 py-2.5">
        <span className="mt-0.5 shrink-0 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">선택 배차</span>
        <p className="min-w-0 text-sm font-semibold leading-5 text-slate-700">{target?.label}</p>
      </div>
    </DialogHeader>
    <div className="space-y-5 overflow-y-auto px-6 pb-5 pt-0">
      {readyTime && <div className="rounded-xl bg-slate-900 px-4 py-3.5 text-white" aria-live="polite">
        <p className="text-[10px] font-semibold tracking-wide text-slate-400">이동·탑승 시간을 포함한 연결 기준</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm"><span className="font-semibold">{selectedTime?.[0]} 도착</span><ArrowRight className="size-3.5 text-slate-500" aria-hidden="true" /><span className="rounded-md bg-white/10 px-2 py-1 text-xs text-violet-200">이동·탑승 {duration}분</span><ArrowRight className="size-3.5 text-slate-500" aria-hidden="true" /><span className="font-bold text-violet-200">{readyMinutes !== null && readyMinutes >= 1440 ? '다음 날 ' : ''}{readyTime} 이후</span></div>
        <p className="mt-2 text-[11px] leading-4 text-slate-400">상대편의 여유 시간이 더 길면 해당 시간을 기준으로 연결합니다.</p>
      </div>}
      <div className="flex gap-2.5 rounded-xl bg-slate-50 px-3.5 py-3 text-[11px] leading-5 text-slate-500"><Info className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden="true" /><div><p>저장하면 다른 호차 환승이 허용됩니다. 같은 차량의 연속 노선은 계속 탑승합니다.</p><p className="mt-1 text-slate-400">기존 예약은 유지되며, 마스터 변경은 일배차 불러오기 후 적용됩니다.</p></div></div>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
    </div>
    <DialogFooter className="bg-slate-50/80 px-6 py-4"><Button variant="outline" onClick={onClose} disabled={saving} className="rounded-lg border-slate-200">취소</Button><Button onClick={() => void save()} disabled={saving} className="min-w-24 rounded-lg bg-violet-600 text-white hover:bg-violet-700">{saving ? '저장 중…' : '저장'}</Button></DialogFooter>
  </DialogContent></Dialog>;
}
