'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Grid from '@/components/Grid';
import type { AgGridReact } from 'ag-grid-react';
import type { ColDef } from 'ag-grid-community';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getDispatchMasterInfos, getDispatchMasterRows } from '@/lib/api/dispatchMaster';
import { getDetailCodes, type DetailCodeRow } from '@/lib/api/common';
import type { DispatchMasterInfo, DispatchMasterRow } from '@/types/dispatchMaster';
import { newRound, newRule, ruleSchema, type CancellationRule, type RuleRecord } from '@/features/cancellation-dispatch/model';
import styles from './page.module.css';
import { selectedRound } from '@/features/cancellation-dispatch/roundSelection';

type Station = { stn_id: string; stn_nm: string; direction?: string; use_yn?: string };
type Vehicle = { vehicle_id: string; vehicle_no: string; use_yn?: string };
const selectClass = 'h-9 w-full min-w-0 rounded-md border border-slate-300 bg-white px-2 text-sm disabled:bg-slate-100';
const heading = 'text-base font-semibold text-slate-900';
const blankStop = () => ({ stationId: '', time: '', reservationDiv: '', deadhead: false, remark: '' });
async function request<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || data.message || '요청을 처리하지 못했습니다.');
  return data as T;
}
function masterTime(value: number | string | null): string {
  if (value == null) return '';
  if (typeof value === 'string' && /^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' });
}

export default function CancellationDispatchPage() {
  const [records, setRecords] = useState<RuleRecord[]>([]);
  const [record, setRecord] = useState<Pick<RuleRecord, 'id' | 'version'> | null>(null);
  const [form, setForm] = useState<CancellationRule>(newRule);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activeRound, setActiveRound] = useState(0);
  const [stations, setStations] = useState<Station[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [reserveCodes, setReserveCodes] = useState<DetailCodeRow[]>([]);
  const [masters, setMasters] = useState<DispatchMasterInfo[]>([]);
  const [masterId, setMasterId] = useState('');
  const [masterRows, setMasterRows] = useState<DispatchMasterRow[]>([]);
  const [sourceRoute, setSourceRoute] = useState('');
  const ruleGridRef = useRef<AgGridReact<Record<string, unknown>>>(null);
  const ruleRows = useMemo(() => records.map(r => ({ id: r.id, name: r.rule.name })), [records]);
  const ruleColumns = useMemo<ColDef[]>(() => [{ field: 'name', headerName: '규칙명', flex: 1, minWidth: 150, tooltipField: 'name' }], []);
  useEffect(() => { ruleGridRef.current?.api?.redrawRows(); }, [record?.id]);
  const round = form.rounds[activeRound];
  const update = (next: CancellationRule) => { setForm(next); setDirty(true); setMessage(''); };
  const updateRound = (patch: Partial<CancellationRule['rounds'][number]>) => update({ ...form, rounds: form.rounds.map((r, i) => i === activeRound ? { ...r, ...patch } : r) });
  const updateStop = (index: number, patch: Partial<ReturnType<typeof blankStop>>) => { if (round) updateRound({ stops: round.stops.map((s, i) => i === index ? { ...s, ...patch } : s) }); };
  const list = async () => { const data = await request<{ rules: RuleRecord[] }>('/api/cancellation-dispatch', { action: 'list' }); setRecords(data.rules); };

  useEffect(() => {
    let current = true;
    Promise.all([
      request<{ rules: RuleRecord[] }>('/api/cancellation-dispatch', { action: 'list' }),
      request<{ stops: Station[] }>('/api/stops', {}), request<{ vehicles: Vehicle[] }>('/api/vehicles', {}), getDetailCodes('EXT_DISPATCH_DIV'),
    ]).then(([rules, stops, cars, codes]) => {
      if (!current) return;
      setRecords(rules.rules); setStations(stops.stops.filter(s => s.use_yn !== 'N')); setVehicles(cars.vehicles.filter(v => v.use_yn !== 'N')); setReserveCodes(codes.codes);
    }).catch(e => { if (current) setError(e.message); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, []);
  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', protect); return () => window.removeEventListener('beforeunload', protect);
  }, [dirty]);
  const mayLeave = () => !dirty || window.confirm('저장하지 않은 변경사항을 버리시겠습니까?');
  const selectRule = (selected?: RuleRecord) => {
    if (!mayLeave()) return;
    setRecord(selected ? { id: selected.id, version: selected.version } : null);
    setForm(selected ? { ...structuredClone(selected.rule), matchMode: 'ANY' } : newRule()); setDirty(false); setActiveRound(0); setError(''); setMessage('');
    setMasters([]); setMasterRows([]); setMasterId(''); setSourceRoute('');
    if (selected) void loadMasters(selected.rule);
  };
  const save = async () => {
    const parsed = ruleSchema.safeParse({ ...form, matchMode: 'ANY' });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const labels: Record<string, string> = { name: '규칙명', season: '계절', day: '요일', conditions: '결항 조건', alternatives: '대체 운항', rounds: '변경 회차', vehicleId: '차량', roundNo: '회차', routeName: '노선명', stops: '정류장', stationId: '정류장 선택', time: '시각', fromPort: '출발항', toPort: '도착항', departureTime: '출항 시각', arrivalTime: '입항 시각' };
      setError(`${issue.path.map(p => typeof p === 'number' ? `${p + 1}번` : labels[String(p)] || String(p)).join(' · ')}: ${issue.message}`); return;
    }
    setBusy(true); setError('');
    try {
      const saved = await request<{ id: string; version: number }>('/api/cancellation-dispatch', { action: 'save', ...record, rule: parsed.data });
      setRecord(saved); setDirty(false); await list(); setMessage('DB에 저장했습니다. 실제 일배차에는 아직 적용되지 않습니다.');
    } catch (e) { setError(e instanceof Error ? e.message : '저장에 실패했습니다.'); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!record || !window.confirm('이 결항 대응 규칙을 삭제하시겠습니까? 실제 일배차는 변경되지 않습니다.')) return;
    setBusy(true); setError('');
    try { await request('/api/cancellation-dispatch', { action: 'delete', ...record }); setRecord(null); setForm(newRule()); setDirty(false); setActiveRound(0); await list(); setMessage('규칙을 삭제했습니다.'); }
    catch (e) { setError(e instanceof Error ? e.message : '삭제에 실패했습니다.'); } finally { setBusy(false); }
  };
  const loadMasters = async (settings: CancellationRule = form) => {
    setBusy(true); setError('');
    try {
      const data = await getDispatchMasterInfos({ season_div: settings.season === 'ALL' ? 'CD002' : settings.season, day_div: settings.day === 'ALL' ? 'CD001' : settings.day });
      const available = data.masters.filter(m => m.use_yn === 'Y'); setMasters(available); setSourceRoute('');
      const first = available[0]; setMasterId(first?.dispatch_id ?? '');
      setMasterRows(first ? (await getDispatchMasterRows(first.dispatch_id)).dispatches : []);
    }
    catch { setError('배차마스터를 불러오지 못했습니다.'); } finally { setBusy(false); }
  };
  const loadRows = async (id: string) => {
    setMasterId(id); setMasterRows([]); setSourceRoute(''); if (!id) return;
    setBusy(true);
    try { const data = await getDispatchMasterRows(id); setMasterRows(data.dispatches); }
    catch { setError('마스터 상세 시간표를 불러오지 못했습니다.'); } finally { setBusy(false); }
  };
  const copyRound = () => {
    if (!round || !sourceRoute || (round.stops.length && !window.confirm('현재 회차의 정류장 목록을 마스터 내용으로 교체하시겠습니까?'))) return;
    const rows = masterRows.filter(r => r.route_id === sourceRoute).sort((a, b) => a.dispatch_seq - b.dispatch_seq);
    const stopRows = rows.filter(r => stations.some(s => s.stn_id === r.point_id));
    try {
      const selection = selectedRound(masterRows, sourceRoute);
      updateRound({ ...selection, stops: stopRows.map(r => ({ stationId: r.point_id, time: masterTime(r.algh_dtm), reservationDiv: r.ext_dispatch_div || '', deadhead: false, remark: r.remark || '' })) });
    } catch (e) { setError(e instanceof Error ? e.message : '회차 선택을 확인해주세요.'); return; }
    setMessage('마스터를 복사했습니다. 차량·회차·시각·예약구간·공차회송을 확인한 뒤 저장해주세요.');
  };

  return <section className={styles.page}>
    <div className="mb-6 flex items-end justify-between gap-4">
      <div><h1 className="text-[28px] font-bold tracking-tight">결항 대응 배차 설정</h1><p className="mt-1 text-sm text-gray-500">결항 조건과 차량·회차별 대체 시간표를 관리합니다.</p></div>
      <div className="flex gap-2"><Button variant="outline" onClick={() => selectRule()} disabled={busy}>신규 등록</Button><Button onClick={save} disabled={busy || loading} className="bg-green-500 text-white hover:bg-green-600">{busy ? '처리 중…' : '저장'}</Button></div>
    </div>
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">설정 등록 단계입니다. 저장된 규칙은 DB에 보관되며, 결항 감지에 따른 일배차 자동 변경은 아직 실행되지 않습니다.</div>
    {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {message && <div role="status" className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</div>}
    <div className={styles.editorLayout}>
      <aside className={styles.ruleGridPanel}>
        <div className={styles.ruleGridHeader}><h2 className={heading}>규칙명 <span className="text-xs text-slate-400">{records.length}</span></h2><Button variant="ghost" size="sm" disabled={busy || loading} onClick={() => { setBusy(true); list().catch(() => setError('목록 조회에 실패했습니다.')).finally(() => setBusy(false)); }}>새로고침</Button></div>
        <Grid gridRef={ruleGridRef} rowData={ruleRows} columnDefs={ruleColumns} height={560} rowHeight={40} gridOptions={{
          getRowId: ({ data }) => String(data.id),
          loading,
          overlayNoRowsTemplate: '등록된 규칙이 없습니다.',
          onRowClicked: ({ data }) => { if (!busy && !loading && data && data.id !== record?.id) selectRule(records.find(r => r.id === data.id)); },
          rowClassRules: { [styles.selectedRule]: ({ data }) => data?.id === record?.id },
        }} />
      </aside>
      <div className="min-w-0 space-y-5">
        <fieldset disabled={busy || loading} className="space-y-5 disabled:opacity-70">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between"><h2 className={heading}>기본 정보</h2><span className="text-xs text-slate-500">{dirty ? '저장하지 않은 변경사항' : record ? '저장된 규칙' : '새 규칙'}</span></div>
            <div className={styles.basicFields}>
              <label className="space-y-1 text-sm">규칙명<Input placeholder="예: 오전편 결항 대응" maxLength={100} value={form.name} onChange={e => update({ ...form, name: e.target.value })} /></label>
              <label className="space-y-1 text-sm">계절<select className={selectClass} value={form.season} onChange={e => update({ ...form, season: e.target.value as CancellationRule['season'] })}><option value="ALL">하계·동계 공통</option><option value="CD001">하계</option><option value="CD002">동계</option></select></label>
              <label className="space-y-1 text-sm">요일<select className={selectClass} value={form.day} onChange={e => update({ ...form, day: e.target.value as CancellationRule['day'] })}><option value="ALL">전체</option><option value="CD001">평일</option><option value="CD002">주말</option></select></label>
            </div>
            <label className="mt-3 block space-y-1 text-sm">비고<Input value={form.note} maxLength={2000} onChange={e => update({ ...form, note: e.target.value })} placeholder="원래 여객선 경유 항로, 적용 조건 등" /></label>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className={heading}>결항 조건</h2><p className="mt-1 text-xs text-slate-500">등록한 조건 중 하나라도 결항이면 해당 규칙을 만족합니다.</p></div><Button size="sm" variant="outline" onClick={() => update({ ...form, conditions: [...form.conditions, { fromPort: '', toPort: '', time: '', basis: 'DEPARTURE' }] })}>조건 추가</Button></div>
            <div className="space-y-2">{form.conditions.map((c, i) => <div key={i} className={styles.conditionRow}>
              <Input aria-label={`결항 조건 ${i + 1} 출발항`} placeholder="출발항" value={c.fromPort} onChange={e => update({ ...form, conditions: form.conditions.map((x, n) => n === i ? { ...x, fromPort: e.target.value } : x) })} />
              <Input aria-label={`결항 조건 ${i + 1} 도착항`} placeholder="도착항" value={c.toPort} onChange={e => update({ ...form, conditions: form.conditions.map((x, n) => n === i ? { ...x, toPort: e.target.value } : x) })} />
              <select aria-label="시각 기준" className={selectClass} value={c.basis} onChange={e => update({ ...form, conditions: form.conditions.map((x, n) => n === i ? { ...x, basis: e.target.value as 'DEPARTURE' | 'ARRIVAL' } : x) })}><option value="DEPARTURE">출항 시각</option><option value="ARRIVAL">입항 시각</option></select>
              <Input aria-label="결항 조건 시각" type="time" value={c.time} onChange={e => update({ ...form, conditions: form.conditions.map((x, n) => n === i ? { ...x, time: e.target.value } : x) })} />
              <Button variant="ghost" size="sm" disabled={form.conditions.length === 1} onClick={() => update({ ...form, conditions: form.conditions.filter((_, n) => n !== i) })}>삭제</Button>
            </div>)}</div>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b p-5"><div><h2 className={heading}>변경 회차 <span className="text-sm text-slate-400">{form.rounds.length}개</span></h2><p className="mt-1 text-xs text-slate-500">한 규칙에 여러 회차를 추가하고, 탭별로 시간표를 수정할 수 있습니다.</p></div><Button variant="outline" size="sm" onClick={() => { update({ ...form, rounds: [...form.rounds, newRound()] }); setActiveRound(form.rounds.length); if (!masterRows.length) void loadMasters(); }}>회차 추가</Button></div>
            {form.rounds.length > 0 && <div className="flex flex-wrap gap-2 border-b bg-slate-50 px-5 py-3">{form.rounds.map((r, i) => <button key={r.key} onClick={() => setActiveRound(i)} className={`rounded-md border px-3 py-1.5 text-sm ${i === activeRound ? 'border-green-400 bg-green-50 font-semibold text-green-800' : 'border-slate-200 bg-white'}`}>{r.routeName || `회차 ${i + 1}`}</button>)}</div>}
            {!round ? <p className="p-10 text-center text-sm text-slate-400">변경할 회차를 추가하세요.</p> : <div className="space-y-4 p-5">
              <div className="grid gap-3 md:grid-cols-[1fr_100px_1fr_auto]">
                <label className="space-y-1 text-sm">호차·회차<select className={selectClass} value={round.sourceRouteId} onChange={e => {
                  if (!e.target.value) return;
                  try {
                    const selection = selectedRound(masterRows, e.target.value);
                    if (form.rounds.some((r, i) => i !== activeRound && r.vehicleId === selection.vehicleId && r.roundNo === selection.roundNo)) { setError('이미 추가한 호차·회차입니다. 해당 탭에서 수정해주세요.'); return; }
                    if (round.stops.length && round.sourceRouteId !== selection.sourceRouteId && !window.confirm('선택한 회차의 기준 시간표로 현재 정류장 목록을 교체하시겠습니까?')) return;
                    const stops = masterRows.filter(r => r.route_id === e.target.value && stations.some(s => s.stn_id === r.point_id)).sort((a, b) => a.dispatch_seq - b.dispatch_seq).map(r => ({ stationId: r.point_id, time: masterTime(r.algh_dtm), reservationDiv: r.ext_dispatch_div || '', deadhead: false, remark: r.remark || '' }));
                    updateRound({ ...selection, stops }); setSourceRoute(e.target.value); setError('');
                  } catch (error) { setError(error instanceof Error ? error.message : '회차 선택을 확인해주세요.'); }
                }}><option value="">호차·회차 선택</option>{round.sourceRouteId && !masterRows.some(r => r.route_id === round.sourceRouteId) && <option value={round.sourceRouteId}>{round.routeName}</option>}{[...new Map(masterRows.map(r => [r.route_id, r.route_nm])).entries()].map(([id, name]) => <option key={id} value={id}>{name || id}</option>)}</select><span className="mt-1 block text-xs text-slate-400">{round.vehicleId ? vehicles.find(v => v.vehicle_id === round.vehicleId)?.vehicle_no || round.vehicleId : '마스터에 지정된 차량이 자동 연결됩니다.'}</span></label>
                <label className="space-y-1 text-sm">변경 후 회차<Input type="number" min={1} max={99} value={round.roundNo} onChange={e => updateRound({ roundNo: Number(e.target.value) })} /></label>
                <label className="space-y-1 text-sm">표시 노선명<Input placeholder="예: 1호차_1" value={round.routeName} onChange={e => updateRound({ routeName: e.target.value })} /></label>
                <Button className="self-end" size="sm" variant="outline" onClick={() => { if (window.confirm('이 변경 회차를 제거하시겠습니까?')) { update({ ...form, rounds: form.rounds.filter((_, i) => i !== activeRound) }); setActiveRound(0); } }}>회차 제거</Button>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="mb-2 text-xs text-slate-500">기존 시간표 복사 (계절 공통은 동계, 요일 전체는 평일 기준으로 조회)</div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => void loadMasters()}>마스터 조회</Button><select aria-label="복사할 배차마스터" className={`${selectClass} max-w-[220px]`} value={masterId} onChange={e => void loadRows(e.target.value)}><option value="">배차마스터 선택</option>{masters.map(m => <option key={m.dispatch_id} value={m.dispatch_id}>{m.dispatch_nm}</option>)}</select><select aria-label="복사할 기존 회차" className={`${selectClass} max-w-[200px]`} value={sourceRoute} onChange={e => setSourceRoute(e.target.value)}><option value="">기존 회차 선택</option>{[...new Map(masterRows.map(r => [r.route_id, r.route_nm])).entries()].map(([id, name]) => <option key={id} value={id}>{name || id}</option>)}</select><Button size="sm" variant="outline" onClick={copyRound} disabled={!sourceRoute}>시간표 복사</Button></div></div>
              <div className="grid gap-3 md:grid-cols-2"><label className="space-y-1 text-sm">여객선 연계 메모<Input value={round.ferryInfo} onChange={e => updateRound({ ferryInfo: e.target.value })} placeholder="예: 신기→여천 입항 08:10" /></label><label className="space-y-1 text-sm">회차 비고<Input value={round.note} onChange={e => updateRound({ note: e.target.value })} placeholder="예: 우실~안도 예약구간 해제 / 회차 명칭 변경" /></label></div>
              <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">정류장별 변경 시간표</h3><Button size="sm" variant="outline" onClick={() => updateRound({ stops: [...round.stops, blankStop()] })}>정류장 추가</Button></div>
              <div className="max-h-[480px] overflow-auto rounded-lg border"><table className="w-full min-w-[820px] text-sm"><thead className="sticky top-0 z-10 bg-slate-100 text-slate-600"><tr>{['순서', '정류장·방면', '도착 시각', '예약구간', '공차', '비고', '편집'].map(h => <th key={h} className="whitespace-nowrap border-b px-2 py-3 text-left font-semibold">{h}</th>)}</tr></thead><tbody>{round.stops.map((s, i) => <tr key={i} className="border-b last:border-0"><td className="w-12 px-2 text-center text-slate-400">{i + 1}</td><td className="min-w-[220px] p-1.5"><select aria-label={`정류장 ${i + 1}`} className={selectClass} value={s.stationId} onChange={e => updateStop(i, { stationId: e.target.value })}><option value="">정류장 선택</option>{stations.map(st => <option key={st.stn_id} value={st.stn_id}>{st.stn_nm}{st.direction ? ` · ${st.direction}` : ''} ({st.stn_id})</option>)}</select></td><td className="w-[105px] p-1.5"><Input aria-label={`${i + 1}번 도착 시각`} type="time" value={s.time} onChange={e => updateStop(i, { time: e.target.value })} /></td><td className="w-[140px] p-1.5"><select aria-label={`${i + 1}번 예약구간`} className={selectClass} value={s.reservationDiv} onChange={e => updateStop(i, { reservationDiv: e.target.value })}><option value="">미설정</option>{reserveCodes.map(c => <option key={c.detail_code} value={c.detail_code}>{c.label || c.value || c.detail_code}</option>)}</select></td><td className="px-2"><input aria-label={`${i + 1}번 공차회송`} type="checkbox" checked={s.deadhead} onChange={e => updateStop(i, { deadhead: e.target.checked })} /></td><td className="min-w-[130px] p-1.5"><Input aria-label={`${i + 1}번 비고`} value={s.remark} onChange={e => updateStop(i, { remark: e.target.value })} /></td><td className="whitespace-nowrap px-1"><button aria-label="정류장 위로" className="p-2 disabled:text-slate-300" disabled={i === 0} onClick={() => { const stops = [...round.stops]; [stops[i - 1], stops[i]] = [stops[i], stops[i - 1]]; updateRound({ stops }); }}>↑</button><button aria-label="정류장 아래로" className="p-2 disabled:text-slate-300" disabled={i === round.stops.length - 1} onClick={() => { const stops = [...round.stops]; [stops[i + 1], stops[i]] = [stops[i], stops[i + 1]]; updateRound({ stops }); }}>↓</button><button aria-label="정류장 삭제" className="p-2 text-red-500" onClick={() => updateRound({ stops: round.stops.filter((_, n) => n !== i) })}>삭제</button></td></tr>)}</tbody></table>{!round.stops.length && <p className="p-8 text-center text-sm text-slate-400">기존 시간표를 복사하거나 정류장을 추가하세요.</p>}</div>
            </div>}
          </div>
        </fieldset>
        <div className="flex justify-between"><Button variant="outline" disabled={busy || !record} onClick={remove}>규칙 삭제</Button><Button disabled={busy || loading} onClick={save} className="bg-green-500 text-white hover:bg-green-600">저장</Button></div>
      </div>
    </div>
  </section>;
}
