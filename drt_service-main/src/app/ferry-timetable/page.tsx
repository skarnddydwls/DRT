"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColDef } from "ag-grid-community";
import Grid from "@/components/Grid";
import { FilterForm } from "@/components/ui/FilterForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
type SailingDetail = Record<string, unknown> & { origin: string; destination: string; departure: string; direction: string };
type Sailing = Record<string, unknown> & { id?: string; sailing_key: string; voyage_code: string; ship_code: string; ship: string; route_name: string; details?: SailingDetail[]; registered?: boolean };
const columns: ColDef[] = [
 {field:"voyage_code",headerName:"운항코드",width:130,minWidth:120},
 {field:"route_name",headerName:"운항명",flex:1.3,minWidth:180},
 {field:"ship_code",headerName:"선박코드",width:130,minWidth:120},
 {field:"ship",headerName:"선박명",flex:1.3,minWidth:180},
];
const detailColumns: ColDef[] = [
 {field:"query_date",headerName:"조회일",width:140,minWidth:130},
 {field:"origin",headerName:"출발항",flex:1,minWidth:120},
 {field:"destination",headerName:"도착항",flex:1,minWidth:120},
 {field:"departure",headerName:"출발시각",width:140,valueFormatter:p=>String(p.value??"").replace(/^(\d{2})(\d{2})$/,"$1:$2")},
 {field:"direction",headerName:"운항방향",width:130},
];async function api(payload: Record<string,unknown>) {
 const response=await fetch("/api/ferry-timetable",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
 const data=await response.json();if(!response.ok)throw new Error(data.error||"시간표를 처리하지 못했습니다.");return data;
}
const button="rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-40";
const input="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm";
export default function FerryTimetablePage(){
 const grid=useRef(null), modalGrid=useRef(null), detailGrid=useRef(null), requestNumber=useRef(0), mainRequest=useRef(0), mainDetailGrid=useRef(null);
 const [items,setItems]=useState<Sailing[]>([]),[candidates,setCandidates]=useState<Sailing[]>([]);
 const [selected,setSelected]=useState<Sailing|null>(null),[choices,setChoices]=useState<Sailing[]>([]);
 const [mainRow,setMainRow]=useState<Sailing|null>(null),[mainDetails,setMainDetails]=useState<SailingDetail[]>([]),[mainLoading,setMainLoading]=useState(false),[mainError,setMainError]=useState("");
 const [mainDate,setMainDate]=useState(()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10));
 const [detail,setDetail]=useState<Sailing|null>(null),[notice,setNotice]=useState("");
 const [open,setOpen]=useState(false),[confirmDelete,setConfirmDelete]=useState(false);
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[candidateLoading,setCandidateLoading]=useState(false);
 const [error,setError]=useState(""),[modalError,setModalError]=useState(""),[message,setMessage]=useState("");
 const [filters,setFilters]=useState({routeName:"",shipName:""});
 const displayedItems=useMemo(()=>items.filter(s=>[s.voyage_code,s.route_name].some(v=>String(v??"").toLowerCase().includes(filters.routeName.trim().toLowerCase()))&&[s.ship_code,s.ship].some(v=>String(v??"").toLowerCase().includes(filters.shipName.trim().toLowerCase()))),[items,filters]);
 const [query,setQuery]=useState(""),[keyword,setKeyword]=useState("");
 const [date,setDate]=useState(()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10));
 const reload=useCallback(async()=>{setLoading(true);setError("");try{const data=await api({action:"list"});setItems(data.items);setSelected(null);}catch(e){setError((e as Error).message);}finally{setLoading(false);}},[]);
 useEffect(()=>{void reload();},[reload]);
 async function search(day=date,term=query){const n=++requestNumber.current;setCandidateLoading(true);setModalError("");setChoices([]);setCandidates([]);setDetail(null);setKeyword(term);try{const data=await api({action:"candidates",date:day});if(n===requestNumber.current)setCandidates((data.items as Sailing[]).map(group=>({...group,details:(group.details??[]).map(item=>({...item,query_date:day}))})));}catch(e){if(n===requestNumber.current)setModalError((e as Error).message);}finally{if(n===requestNumber.current)setCandidateLoading(false);}}
 const visible=useMemo(()=>candidates.filter(s=>[s.voyage_code,s.ship_code,s.ship,s.route_name,...(s.details??[]).flatMap(d=>[d.origin,d.destination,d.departure])].some(v=>String(v??"").toLowerCase().includes(keyword.trim().toLowerCase()))),[candidates,keyword]);
 async function add(){setBusy(true);setModalError("");try{const data=await api({action:"add",date,keys:choices.map(s=>s.sailing_key)});setOpen(false);setMessage(`${data.addedCount}개 시간표를 추가했습니다.`);await reload();}catch(e){setModalError((e as Error).message);}finally{setBusy(false);}}
 async function remove(){if(!selected)return;setBusy(true);try{await api({action:"delete",id:selected.id});setConfirmDelete(false);setMessage("시간표를 삭제했습니다.");await reload();}catch(e){setConfirmDelete(false);setNotice((e as Error).message);}finally{setBusy(false);}}
 async function loadMainDetails(row:Sailing,day:string){
  const number=++mainRequest.current;setMainDetails([]);setMainError("");setMainLoading(true);
  try{const data=await api({action:"details",id:row.id,date:day});if(number===mainRequest.current)setMainDetails((data.items as SailingDetail[]).map(item=>({...item,query_date:day})));}
  catch(e){if(number===mainRequest.current)setMainError((e as Error).message);}
  finally{if(number===mainRequest.current)setMainLoading(false);}
 }
 function showMainDetails(row:Sailing){const today=new Date(Date.now()+9*3600000).toISOString().slice(0,10);setMainRow(row);setMainDate(today);void loadMainDetails(row,today);}
 return <section>
 <div className="mb-6 flex items-end justify-between gap-4">
 <div><h1 className="text-[28px] font-bold tracking-tight">여객선 시간표 관리</h1><p className="mt-1 text-sm text-gray-500">여객선 시간표를 조회하고 관리합니다.</p></div>
 <div className="flex gap-2">
 <button type="button" className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-sm" disabled={busy} onClick={()=>{const today=new Date(Date.now()+9*3600000).toISOString().slice(0,10);setDate(today);setQuery("");setOpen(true);void search(today,"");}}>추가</button>
 <button type="button" className="px-3 py-2 rounded-md bg-red-500 text-white text-sm hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-sm" disabled={!selected||busy||loading} onClick={()=>setConfirmDelete(true)}>삭제</button>
 </div></div>
 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <FilterForm fields={[{name:"routeName",label:"운항(코드/명)",type:"text",placeholder:"운항코드 또는 운항명"},{name:"shipName",label:"선박(코드/명)",type:"text",placeholder:"선박코드 또는 선박명"}]} defaultValues={{routeName:"",shipName:""}} values={filters} onSearch={(values:{routeName:string;shipName:string})=>{setFilters(values);void reload();}} className="mb-4 [&_label]:whitespace-nowrap"/>
 {error&&<p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}{message&&<p role="status" className="mb-4 text-sm text-green-700">{message}</p>}
 <div className="relative min-h-[280px]" style={{height:"calc(100vh - 400px)"}}>
 {loading&&<div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-white/75 backdrop-blur-[1px]"><div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"/><p className="text-sm font-semibold text-gray-700">데이터를 불러오는 중...</p></div>}
 <Grid gridRef={grid} rowData={displayedItems} columnDefs={[...columns,{headerName:"운항편",width:140,minWidth:140,cellRenderer:({data}:{data:Sailing})=><button type="button" className="font-semibold text-blue-600 hover:underline" onClick={()=>showMainDetails(data)}>운항편 보기</button>}]} height="100%" enableNumberColoring={true} gridOptions={{rowSelection:{mode:"singleRow",enableClickSelection:true,checkboxes:false},getRowId:p=>p.data.sailing_key,onSelectionChanged:e=>setSelected(e.api.getSelectedRows()[0]??null),getRowStyle:p=>selected?.sailing_key===p.data?.sailing_key?{backgroundColor:"#e3f2fd"}:undefined,localeText:{noRowsToShow:"조회된 시간표가 없습니다. 검색 조건을 확인하거나 추가 버튼으로 등록해주세요."}}}/>
 </div></div>
 <Dialog open={open} onOpenChange={value=>{if(!busy){setOpen(value);if(!value){++requestNumber.current;setCandidateLoading(false);}}}}><DialogContent className="w-[calc(100vw-32px)] max-w-[1280px] min-w-0 max-h-[90vh] overflow-y-auto">
 <DialogHeader><DialogTitle>여객선 운항편 추가</DialogTitle><DialogDescription>운항코드·선박코드별로 등록합니다. 행을 클릭하거나 하위 운항편 보기를 누르면 출발항·도착항·시각을 확인할 수 있습니다.</DialogDescription></DialogHeader>
 <form onSubmit={e=>{e.preventDefault();if(!busy&&!candidateLoading)void search();}} onKeyDown={e=>{if(e.key==="Enter"){e.stopPropagation();if(e.nativeEvent.isComposing||e.nativeEvent.keyCode===229)e.preventDefault();}}} className="my-4 flex flex-wrap items-end gap-3">
 <label className="flex flex-col gap-1 text-sm">조회일<input aria-label="조회일" type="date" required value={date} disabled={busy||candidateLoading} onChange={e=>{setDate(e.target.value);setCandidates([]);setChoices([]);setDetail(null);}} className={input}/></label>
 <label className="flex flex-1 flex-col gap-1 text-sm">운항편 검색<input placeholder="운항코드, 선박코드, 운항명, 선박명" value={query} onChange={e=>setQuery(e.target.value)} className={input}/></label>
 <button type="submit" className={`${button} bg-gray-900 text-white`} disabled={busy||candidateLoading}>조회</button></form>
 {modalError&&<p role="alert" className="mb-3 text-sm text-red-600">{modalError}</p>}
 <p className="mb-2 text-sm text-gray-500">조회 {visible.length}건 · 선택 {choices.length}건</p>
 <Grid gridRef={modalGrid} rowData={visible} columnDefs={[{headerName:"하위 운항편",width:150,minWidth:150,cellRenderer:({data}:{data:Sailing})=><button type="button" className="font-semibold text-blue-600 hover:underline" onClick={()=>setDetail(data)}>운항편 {data.details?.length??0}건 보기</button>},...columns.map(column=>({...column,minWidth:Math.max(column.minWidth??0,120),wrapHeaderText:true,autoHeaderHeight:true})),{headerName:"등록상태",width:120,minWidth:120,wrapHeaderText:true,autoHeaderHeight:true,valueGetter:p=>p.data.registered?"등록됨":"미등록",cellStyle:p=>p.data?.registered?{color:"#16a34a",fontWeight:600}:{color:"inherit",fontWeight:600}}]} height={detail?"min(28vh, 280px)":"min(45vh, 440px)"} gridOptions={{loading:candidateLoading,onRowClicked:e=>setDetail(e.data??null),headerHeight:44,selectionColumnDef:{width:52,minWidth:52,maxWidth:52,resizable:false},getRowId:p=>p.data.sailing_key,rowSelection:{mode:"multiRow",isRowSelectable:n=>!n.data?.registered,hideDisabledCheckboxes:true},onSelectionChanged:e=>setChoices(e.api.getSelectedRows()),localeText:{noRowsToShow:"조회 조건을 입력하고 조회 버튼을 눌러주세요. 검색 결과가 없으면 날짜나 검색어를 바꿔주세요."}}}/>
 {detail&&<div className="mt-4 rounded-xl border bg-gray-50 p-3"><div className="mb-2 flex items-center justify-between text-sm"><span className="font-semibold">{detail.route_name} · {detail.ship} <span className="font-normal text-gray-500">({detail.voyage_code} / {detail.ship_code})</span> 하위 운항편</span><button type="button" className="text-gray-500 hover:text-gray-900" onClick={()=>setDetail(null)}>접기</button></div><Grid gridRef={detailGrid} rowData={detail.details??[]} columnDefs={detailColumns} height="min(24vh, 220px)"/></div>}
 <DialogFooter className="mt-5"><button className={`${button} border`} disabled={busy} onClick={()=>setOpen(false)}>취소</button><button className={`${button} bg-blue-600 text-white`} disabled={busy||candidateLoading||choices.length===0} onClick={()=>void add()}>{busy?"저장 중...":"선택 추가"}</button></DialogFooter>
 </DialogContent></Dialog>
 <Dialog open={!!mainRow} onOpenChange={value=>{if(!value){++mainRequest.current;setMainRow(null);setMainLoading(false);}}}><DialogContent className="w-[calc(100vw-32px)] max-w-[1000px] max-h-[90vh] overflow-y-auto">
 <DialogHeader><DialogTitle>운항편 보기</DialogTitle></DialogHeader>
 <form className="mb-4 flex items-end gap-3" onSubmit={e=>{e.preventDefault();if(mainRow&&!mainLoading)void loadMainDetails(mainRow,mainDate);}} onKeyDown={e=>{if(e.key==="Enter"){e.stopPropagation();if(e.nativeEvent.isComposing||e.nativeEvent.keyCode===229)e.preventDefault();}}}>
 <label className="flex flex-col gap-1 text-sm">조회일<input className={input} type="date" required value={mainDate} onChange={e=>{const day=e.target.value;setMainDate(day);if(mainRow&&/^\d{4}-\d{2}-\d{2}$/.test(day)){void loadMainDetails(mainRow,day);}else{++mainRequest.current;setMainDetails([]);setMainLoading(false);setMainError("");}}}/></label><button type="submit" className={`${button} bg-gray-900 text-white`} disabled={mainLoading}>조회</button>
 </form>{mainError&&<p role="alert" className="mb-3 text-sm text-red-600">{mainError}</p>}
 <p className="mb-2 text-sm text-gray-500">운항편 {mainDetails.length}건</p><Grid gridRef={mainDetailGrid} rowData={mainDetails} columnDefs={detailColumns} height="min(50vh, 460px)" gridOptions={{loading:mainLoading,localeText:{noRowsToShow:"해당 조회일에 수집된 운항편이 없습니다."}}}/>
 <DialogFooter className="mt-4"><button type="button" className={`${button} border`} onClick={()=>{++mainRequest.current;setMainRow(null);setMainLoading(false);}}>닫기</button></DialogFooter>
 </DialogContent></Dialog>
 <Dialog open={confirmDelete} onOpenChange={v=>{if(!busy)setConfirmDelete(v);}}><DialogContent><DialogHeader><DialogTitle>시간표 삭제</DialogTitle><DialogDescription>{selected?.route_name} · {selected?.ship} ({selected?.voyage_code} / {selected?.ship_code}) 시간표를 삭제하시겠습니까?</DialogDescription></DialogHeader><DialogFooter><button className={`${button} border`} disabled={busy} onClick={()=>setConfirmDelete(false)}>취소</button><button className={`${button} bg-red-600 text-white`} disabled={busy} onClick={()=>void remove()}>삭제</button></DialogFooter></DialogContent></Dialog>
 <Dialog open={!!notice} onOpenChange={v=>{if(!v)setNotice("");}}><DialogContent><DialogHeader><DialogTitle>시간표 삭제 안내</DialogTitle><DialogDescription>{notice}</DialogDescription></DialogHeader><DialogFooter><button className={`${button} bg-gray-900 text-white`} onClick={()=>setNotice("")}>확인</button></DialogFooter></DialogContent></Dialog>
 </section>;
}
