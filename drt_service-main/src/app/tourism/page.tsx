'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, LoaderCircle } from 'lucide-react';
import type { ColDef } from 'ag-grid-community';
import type { AgGridReact } from 'ag-grid-react';
import Grid from '@/components/Grid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FilterForm } from '@/components/ui/FilterForm';
import { defaultFilters, stopFields } from '@/features/stop/fieldconfig';
import type { StopFilters } from '@/types/stop';
import { groupTourismStops, type TourismStop } from '@/features/tourism/stopGroups';
import { validateAttractionDraft } from '@/features/tourism/validateDraft';

type Stop = TourismStop;
type Attraction = { id: string; stn_id: string; name: string; category: string; address: string; description: string; display_order: number; enabled: boolean; has_image: boolean };
type Draft = Omit<Attraction, 'id' | 'stn_id' | 'has_image'> & { id?: string };
const blank = (): Draft => ({ name: '', category: '관광지', address: '', description: '', display_order: 0, enabled: true });
const field = 'h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:opacity-50';
function coordinate(value: number | string | null | undefined) {
  if (value == null || String(value).trim() === '') return '-';
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(6) : '-';
}

export default function TourismPage() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [filters, setFilters] = useState<StopFilters>(defaultFilters);
  const [stopsLoading, setStopsLoading] = useState(true);
  const [stopsFailed, setStopsFailed] = useState(false);
  const [station, setStation] = useState('');
  const [items, setItems] = useState<Attraction[]>([]);
  const [draft, setDraft] = useState<Draft>(blank);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const revision = useRef(0);
  const gridRef = useRef<AgGridReact<Record<string, unknown>> | null>(null);
  const stopGridRef = useRef<AgGridReact<Record<string, unknown>> | null>(null);
  const stopColumns = useMemo<ColDef<Stop>[]>(() => [
    { field: 'stn_nm', headerName: '정류장명', minWidth: 130, flex: 1.4, sortable: true, tooltipField: 'stn_nm' },
    { field: 'stn_no', headerName: '정류장번호', minWidth: 165, flex: 1.8, tooltipField: 'stn_no' },
    { field: 'gps_y', headerName: '위도', minWidth: 100, flex: 1, valueFormatter: p => coordinate(p.value) },
    { field: 'gps_x', headerName: '경도', minWidth: 105, flex: 1, valueFormatter: p => coordinate(p.value) },
  ], []);
  const visibleStops = useMemo(() => {
    const keyword = filters.stopName.trim().toLocaleLowerCase();
    return stops.filter(stop => stop.stn_nm.toLocaleLowerCase().includes(keyword));
  }, [filters.stopName, stops]);
  const selectedStop = stops.find(stop => stop.stn_id === station);
  const columns = useMemo<ColDef<Attraction>[]>(() => [
    { field: 'display_order', headerName: '순서', width: 60, minWidth: 60, flex: 0, cellStyle: { textAlign: 'center' } },
    { field: 'name', headerName: '장소명', minWidth: 120, flex: 1.3, tooltipField: 'name' },
    { field: 'category', headerName: '분류', minWidth: 80, flex: 0.7 },
    { field: 'address', headerName: '주소', minWidth: 140, flex: 1.8, tooltipField: 'address' },
    { field: 'has_image', headerName: '사진', width: 65, minWidth: 65, flex: 0, valueFormatter: p => p.value ? '등록' : '없음', cellStyle: { textAlign: 'center' } },
    { field: 'enabled', headerName: '앱 표시', width: 90, minWidth: 90, flex: 0, valueFormatter: p => p.value ? '표시' : '숨김', cellStyle: p => ({ textAlign: 'center', color: p.value ? '#16a34a' : '#6b7280' }) },
  ], []);
  useEffect(() => {
    const abort = new AbortController();
    // selectStationList.do restricts this list to USE_YN='Y' in the deployed mapper.
    fetch('/api/stops', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: abort.signal })
      .then(async r => { if (!r.ok) throw Error(); return r.json(); })
      .then(data => setStops(groupTourismStops(data.stops))).catch(() => { if (!abort.signal.aborted) { setStopsFailed(true); setMessage('정류장을 불러오지 못했습니다. 새로고침해주세요.'); } })
      .finally(() => { if (!abort.signal.aborted) setStopsLoading(false); });
    return () => abort.abort();
  }, []);
  useEffect(() => {
    if (!image) { setPreview(null); return; }
    const url = URL.createObjectURL(image); setPreview(url); return () => URL.revokeObjectURL(url);
  }, [image]);
  useEffect(() => {
    const current = ++revision.current;
    reset(); setItems([]); setMessage('');
    if (!station) { setLoading(false); return; }
    setLoading(true);
    load(station).then(data => { if (revision.current === current) setItems(data); })
      .catch(error => { if (revision.current === current) setMessage(error.message); })
      .finally(() => { if (revision.current === current) setLoading(false); });
  }, [station]);
  function reset() { setDraft(blank()); setImage(null); setRemoveImage(false); if (input.current) input.current.value = ''; }
  async function load(id: string): Promise<Attraction[]> {
    const response = await fetch('/api/tourism', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ STN_ID: id }) });
    const data = await response.json(); if (!response.ok) throw Error(data.error); return data;
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    const validation = validateAttractionDraft(station, draft);
    if (validation) {
      setMessage(validation);
      if (!draft.name.trim()) document.getElementById('name')?.focus();
      else if (!draft.category.trim()) document.getElementById('category')?.focus();
      else document.getElementById('order')?.focus();
      return;
    }
    setBusy(true); setMessage('');
    try {
      const form = new FormData();
      Object.entries(draft).forEach(([key, value]) => form.set(key, String(value)));
      form.set('stn_id', station); form.set('remove_image', String(removeImage)); if (image) form.set('image', image);
      const response = await fetch('/api/tourism', { method: 'POST', body: form }); const data = await response.json();
      if (!response.ok || data.success !== true) throw Error(data.error || '저장 완료를 확인하지 못했습니다. 다시 시도해주세요.');
      reset();
      setMessage('저장했습니다. 앱에서 해당 정류장을 선택하면 확인할 수 있습니다.');
      try { setItems(await load(station)); } catch { setMessage('저장은 완료됐지만 목록 조회에 실패했습니다. 새로고침해주세요.'); }
    } catch (error) { setMessage(error instanceof Error ? error.message : '저장하지 못했습니다.'); }
    finally { setBusy(false); }
  }
  return (
    <section className="rounded-xl border bg-white p-4">
      <div className="mb-4"><h1 className="text-xl font-semibold">주변 관광지 관리</h1></div>

      <fieldset disabled={busy}>
        <FilterForm<StopFilters>
          fields={stopFields}
          defaultValues={defaultFilters}
          values={filters}
          onChange={setFilters}
          onSearch={setFilters}
          className="mb-4"
        />
      </fieldset>

      {message && <p role="status" className="mb-4 rounded-md border bg-gray-50 px-4 py-3 text-sm text-gray-700">{message}</p>}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(420px,1fr)]">
        <div className="tourism-grid min-w-0">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">정류장 목록 <span className="ml-1 text-gray-500">총 {visibleStops.length}건</span></p>
            <p className="text-xs text-gray-500">같은 이름은 한 번만 표시 · 관광지는 양방향 공통</p>
          </div>
          <div className="mb-4" role="region" aria-label="사용 중인 정류장 목록">
            <Grid
              rowData={visibleStops}
              columnDefs={stopColumns}
              gridRef={stopGridRef}
              height={180}
              gridOptions={{
                headerHeight: 40,
                defaultColDef: { wrapHeaderText: false },
                rowSelection: 'single',
                suppressRowClickSelection: false,
                suppressCellFocus: false,
                loading: stopsLoading,
                getRowId: p => String(p.data.stn_id),
                localeText: { noRowsToShow: stopsFailed ? '정류장 조회에 실패했습니다. 새로고침해주세요.' : '검색 결과가 없습니다.', loadingOoo: '정류장 목록을 불러오는 중...' },
                getRowStyle: p => p.data?.stn_id === station ? { backgroundColor: '#e3f2fd' } : undefined,
                onRowClicked: event => { if (!busy && event.data) setStation(String(event.data.stn_id)); },
                onCellKeyDown: event => {
                  const key = (event.event as KeyboardEvent | undefined)?.key;
                  if (!busy && event.data && (key === 'Enter' || key === ' ')) {
                    event.event?.preventDefault(); setStation(String(event.data.stn_id));
                  }
                },
              }}
            />
          </div>
          <div className="mb-3 flex min-h-9 items-center justify-between gap-3">
            <div className="min-w-0"><p className="text-sm font-medium">관광지 목록 <span className="ml-1 text-gray-500">총 {items.length}건</span></p>{selectedStop && <p className="mt-1 truncate text-xs text-gray-500">{selectedStop.stn_nm} · {selectedStop.stn_id}{selectedStop.direction ? ` · ${selectedStop.direction}` : ''}</p>}</div>
            <Button type="button" disabled={!station || busy || loading} className="bg-blue-600 text-white hover:bg-blue-700" onClick={reset}>추가</Button>
          </div>
          <Grid
            rowData={items}
            columnDefs={columns}
            gridRef={gridRef}
            height="clamp(260px, calc(100vh - 550px), 480px)"
            gridOptions={{
              headerHeight: 40,
              defaultColDef: { wrapHeaderText: false },
              rowSelection: 'single',
              suppressRowClickSelection: false,
              loading,
              getRowId: p => String(p.data.id),
              localeText: { noRowsToShow: station ? '등록된 관광지가 없습니다. 추가 버튼으로 등록해주세요.' : '정류장을 선택해주세요.', loadingOoo: '데이터를 불러오는 중...' },
              getRowStyle: p => draft.id && p.data?.id === draft.id ? { backgroundColor: '#e3f2fd' } : undefined,
              onRowClicked: event => {
                if (busy || loading || !event.data) return;
                const item = event.data as Attraction;
                setDraft({ id: item.id, name: item.name, category: item.category, address: item.address, description: item.description, display_order: item.display_order, enabled: item.enabled });
                setImage(null); setRemoveImage(false); if (input.current) input.current.value = '';
              },
            }}
          />
        </div>

        <form onSubmit={save} noValidate className="min-w-0 overflow-hidden rounded-xl border">
          <div className="border-b bg-gray-50 px-4 py-3 text-sm font-semibold">{draft.id ? '관광지 수정' : '관광지 등록'}</div>
          <fieldset disabled={!station || busy || loading}>
            <div className="space-y-4 p-4">
              <div className="space-y-2"><Label htmlFor="name">장소명 <span className="text-red-500">*</span></Label><Input id="name" required maxLength={100} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="category">분류 <span className="text-red-500">*</span></Label><Input id="category" required maxLength={30} value={draft.category} placeholder="관광지 / 항구 / 편의점" onChange={e => setDraft({ ...draft, category: e.target.value })} /></div>
                <div className="space-y-2"><Label htmlFor="order">표시 순서</Label><Input id="order" type="number" min={0} max={9999} required value={draft.display_order} onChange={e => setDraft({ ...draft, display_order: Number(e.target.value) })} /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="address">주소</Label><Input id="address" maxLength={300} value={draft.address} onChange={e => setDraft({ ...draft, address: e.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="description">소개</Label><textarea id="description" rows={3} maxLength={1000} className={`${field} h-auto py-2`} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></div>
              <div className="space-y-2">
                <Label htmlFor="photo">사진</Label>
                <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-3">
                  {preview ? <img src={preview} alt="업로드 사진 미리보기" className="mb-3 h-32 w-full rounded-md object-cover" /> : <div className="mb-3 flex items-center gap-2 text-xs text-gray-500"><ImagePlus size={18} /><span>{draft.id ? '새 사진을 선택하면 기존 사진이 교체됩니다.' : '장소 사진을 선택해주세요.'}</span></div>}
                  <input ref={input} id="photo" type="file" accept="image/jpeg,image/png" className="w-full text-sm file:mr-2 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm disabled:opacity-50" onChange={e => { const file = e.target.files?.[0] ?? null; if (file && (file.size > 5242880 || !['image/jpeg', 'image/png'].includes(file.type))) { setMessage('5MB 이하 JPG·PNG 사진을 선택해주세요.'); e.target.value = ''; setImage(null); return; } setImage(file); if (file) setRemoveImage(false); }} />
                  <p className="mt-2 text-xs text-gray-500">JPG·PNG, 최대 5MB. 미선택 시 기존 사진이 유지됩니다.</p>
                </div>
                {draft.id && !image && <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-green-600" checked={removeImage} onChange={e => setRemoveImage(e.target.checked)} />기존 사진 제거</label>}
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-green-600" checked={draft.enabled} onChange={e => setDraft({ ...draft, enabled: e.target.checked })} />승객 앱에 표시</label>
            </div>
            <div className="border-t bg-gray-50 px-4 py-3">
              {message && <p role="status" aria-live="polite" className="mb-3 text-sm text-gray-700">{message}</p>}
              {!station && <p className="mb-3 text-sm text-gray-500">왼쪽 목록에서 정류장을 선택하면 등록할 수 있습니다.</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={reset}>초기화</Button>
                <Button type="submit" className="bg-green-600 text-white hover:bg-green-700">{busy && <LoaderCircle size={16} className="animate-spin" />}{busy ? '저장 중...' : '저장'}</Button>
              </div>
            </div>
          </fieldset>
        </form>
      </div>
    </section>
  );
}
