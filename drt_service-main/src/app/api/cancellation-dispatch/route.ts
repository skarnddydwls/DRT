import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_BASE_URL } from '@/config/backend';
import { ruleSchema } from '@/features/cancellation-dispatch/model';

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin');
    if (origin && new URL(origin).host !== request.headers.get('host')) return NextResponse.json({ error: '허용되지 않은 요청입니다.' }, { status: 403 });
    const body = await request.json();
    if (!['list', 'save', 'delete'].includes(body.action)) return NextResponse.json({ error: '잘못된 작업입니다.' }, { status: 400 });
    if (body.action === 'save') {
      const parsed = ruleSchema.safeParse(body.rule);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
      body.rule = parsed.data;
    }
    const response = await fetch(`${BACKEND_BASE_URL}/manageCancellationDispatchRule.do`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(15000) });
    const data = await response.json().catch(() => ({ error: '서버 응답을 확인해주세요.' }));
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: '규칙을 처리하지 못했습니다. 서버 연결을 확인해주세요.' }, { status: 502 });
  }
}
