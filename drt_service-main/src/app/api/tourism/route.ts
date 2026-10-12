import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_BASE_URL } from '@/config/backend';
import { allowTourismRequest } from '@/features/tourism/requestOrigin';

export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  // Local development management only. Do not expose this route before adding center admin authentication.
  const origin = request.headers.get('origin');
  if (!allowTourismRequest(origin, request.headers.get('host') ?? request.nextUrl.host, request.nextUrl.protocol)) {
    return NextResponse.json({ error: '허용되지 않은 요청입니다. 로컬 센터와 같은 포트에서 접속해주세요.' }, { status: 403 });
  }
  try {
    const upload = request.headers.get('content-type')?.startsWith('multipart/form-data');
    if (Number(request.headers.get('content-length') ?? 0) > 6 * 1024 * 1024) {
      return NextResponse.json({ error: '사진은 5MB 이하로 올려주세요.' }, { status: 413 });
    }
    let body: FormData | string;
    if (upload) {
      const form = await request.formData();
      const file = form.get('image');
      if (file instanceof File && (file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png'].includes(file.type))) {
        return NextResponse.json({ error: '5MB 이하 JPG·PNG 사진만 사용할 수 있습니다.' }, { status: 400 });
      }
      body = form;
    } else {
      const input = await request.json();
      body = JSON.stringify({ STN_ID: input.STN_ID });
    }
    const response = await fetch(`${BACKEND_BASE_URL}/admin/${upload ? 'saveStationAttraction' : 'selectStationAttractions'}.do`, {
      method: 'POST', body, ...(upload ? {} : { headers: { 'Content-Type': 'application/json' } }),
      signal: AbortSignal.timeout(20000), cache: 'no-store',
    });
    if (!response.ok) return NextResponse.json({ error: response.status === 400 ? '입력값 또는 사진 파일을 확인해주세요. JPG·PNG, 최대 5MB·2,400만 화소입니다.' : '관광지 정보를 처리하지 못했습니다.' }, { status: response.status });
    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json({ error: '서버 연결을 확인해주세요.' }, { status: 502 });
  }
}
