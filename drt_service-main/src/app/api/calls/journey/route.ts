import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/config/backend";
import { allowCenterRequest } from "@/features/tourism/requestOrigin";
export async function POST(request:NextRequest){
 if(!allowCenterRequest(request.headers.get("origin"),request.headers.get("host")??request.nextUrl.host,request.nextUrl.protocol,process.env.CENTER_ALLOWED_ORIGINS))return NextResponse.json({error:"센터 화면에서 요청해주세요."},{status:403});
 try{const body=await request.json();const response=await fetch(`${BACKEND_BASE_URL}/selectCenterReservationJourney.do`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({DEVICE_ID:body.DEVICE_ID,CALL_DTM:body.CALL_DTM}),cache:"no-store"});const data=await response.json().catch(()=>({error:"환승 내역 응답을 확인하지 못했습니다."}));return NextResponse.json(data,{status:response.status});}
 catch{return NextResponse.json({error:"환승 내역 서버에 연결하지 못했습니다."},{status:502});}
}
