"use client";
import { useEffect, useState } from "react";
import { ArrowRightLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { post } from "@/lib/api/client";
export interface TransferSetting { transfer_enabled?: boolean; transfer_minutes?: number; transfer_code?: string | null; transfer_side?: string | null }
export function DispatchTransferDialog({ open, onClose, target, onSaved }: {
  open: boolean; onClose: () => void;
  target: (TransferSetting & { dispatch_id?: string; dispatch_dt?: string; device_id?: string; route_id: string; point_id: string; dispatch_seq: number; label: string }) | null;
  onSaved: (settings: TransferSetting) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [side, setSide] = useState('A');
  useEffect(() => { if(open) { setError(''); setCode(target?.transfer_code ?? ''); setSide(target?.transfer_side ?? 'A'); } }, [open, target]);
  const save = async (enabled = true) => {
    if (!target || saving) return;
    if (enabled && !/^[A-Z0-9_-]{1,32}$/.test(code.trim().toUpperCase())) { setError('환승 코드는 영문·숫자·_·-를 사용해 32자 이내로 입력해주세요.'); return; }
    setSaving(true); setError('');
    try {
      const settings = { transfer_enabled: enabled, transfer_minutes: 0, transfer_code: enabled ? code.trim().toUpperCase() : null, transfer_side: enabled ? side : null };
      const result = await post<{ success: boolean }>('/api/dispatch-transfer', { ...target, ...settings });
      if (!result.success) throw new Error('선택한 배차를 다시 조회해주세요.');
      onSaved(settings); onClose();
    } catch { setError('저장하지 못했습니다. 같은 코드의 A/B 지점이 이미 지정되었는지 확인해주세요.'); }
    finally { setSaving(false); }
  };
  return <Dialog open={open} onOpenChange={(value) => { if (!value && !saving) onClose(); }}><DialogContent showCloseButton={!saving} style={{ padding: 0, borderRadius: 16 }} className="flex max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-[520px] flex-col overflow-hidden border-slate-200 bg-white shadow-2xl">
    <DialogHeader style={{ marginBottom: 0, textAlign: 'left' }} className="bg-gradient-to-br from-violet-50 via-white to-white px-6 pb-2 pt-6">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-sm"><ArrowRightLeft className="size-5" aria-hidden="true" /></div>
        <div><p className="mb-1 text-[10px] font-bold tracking-widest text-violet-600">운행 연결 관리</p><DialogTitle className="text-xl font-bold text-slate-900">환승 설정</DialogTitle></div>
      </div>
      <DialogDescription className="text-xs text-slate-500">같은 환승 코드의 A·B 배차 지점을 1:1로 연결합니다. 같은 시각의 배차도 환승할 수 있습니다.</DialogDescription>
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-violet-100 bg-white/80 px-3 py-2.5">
        <span className="mt-0.5 shrink-0 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">선택 배차</span>
        <p className="min-w-0 text-sm font-semibold leading-5 text-slate-700">{target?.label}</p>
      </div>
      {target?.dispatch_id && <p className="mt-3 text-xs font-semibold text-slate-600">현재 상태: {target.transfer_enabled ? '환승 허용' : '환승 미설정'}</p>}
    </DialogHeader>
    <div className="space-y-5 overflow-y-auto px-6 pb-5 pt-0">
      <div className="grid grid-cols-[1fr_120px] gap-3">
        <label className="space-y-2 text-xs font-semibold text-slate-600">환승 코드
          <input aria-label="환승 코드" value={code} maxLength={32} disabled={saving} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="예: T001" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" />
        </label>
        <label className="space-y-2 text-xs font-semibold text-slate-600">연결 지점
          <select aria-label="환승 연결 지점" value={side} disabled={saving} onChange={e => setSide(e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="A">A 지점</option><option value="B">B 지점</option></select>
        </label>
      </div>
      <div className="flex gap-2.5 rounded-xl bg-slate-50 px-3.5 py-3 text-[11px] leading-5 text-slate-500"><Info className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden="true" /><div><p>상대 차량의 배차 지점에 같은 코드와 반대 A/B 지점을 지정해주세요. 두 번째 차량의 시각이 첫 번째 차량과 같거나 늦으면 연결됩니다. 최소 대기 시간 제한은 없습니다.</p><p className="mt-1">환승 후에는 해당 차량의 같은 회차에서만 하차할 수 있습니다.</p><p className="mt-1 text-slate-400">기존 예약은 유지되며, 마스터 변경은 일배차 불러오기 후 적용됩니다.</p></div></div>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
    </div>
    <DialogFooter className="bg-slate-50/80 px-6 py-4">
      <Button variant="outline" onClick={onClose} disabled={saving} className="rounded-lg border-slate-200">취소</Button>
      <Button variant="outline" onClick={() => void save(false)} disabled={saving || !target?.transfer_enabled} className="rounded-lg border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">환승해제</Button>
      <Button onClick={() => void save()} disabled={saving} className="min-w-24 rounded-lg bg-violet-600 text-white hover:bg-violet-700">{saving ? '처리 중…' : '환승설정'}</Button>
    </DialogFooter>
  </DialogContent></Dialog>;
}
