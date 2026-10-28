import { z } from 'zod';

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, '시각은 HH:mm으로 입력해주세요.');
const text = (max: number) => z.string().trim().min(1, '필수 항목을 입력해주세요.').max(max);
export const ruleSchema = z.object({
  name: text(100), season: z.enum(['ALL', 'CD001', 'CD002']), day: z.enum(['ALL', 'CD001', 'CD002']),
  matchMode: z.enum(['ANY', 'ALL']).transform(() => 'ANY' as const), note: z.string().max(2000),
  conditions: z.array(z.object({ fromPort: text(50), toPort: text(50), time, basis: z.enum(['DEPARTURE', 'ARRIVAL']) })).min(1).max(30),
  alternatives: z.array(z.object({ fromPort: text(50), toPort: text(50), departureTime: time, arrivalTime: time })).max(30),
  rounds: z.array(z.object({
    key: text(50), vehicleId: text(30), roundNo: z.number().int().min(1).max(99),
    sourceRouteId: z.string().max(30), routeName: text(100), note: z.string().max(2000),
    ferryInfo: z.string().max(200),
    stops: z.array(z.object({ stationId: text(30), time, reservationDiv: z.string().max(20), deadhead: z.boolean(), remark: z.string().max(500) })).min(2).max(200),
  })).min(1).max(30),
}).superRefine((rule, ctx) => {
  const keys = new Set<string>();
  rule.rounds.forEach((round, r) => {
    const key = `${round.vehicleId}/${round.roundNo}`;
    if (keys.has(key)) ctx.addIssue({ code: 'custom', path: ['rounds', r, 'roundNo'], message: '같은 차량·회차가 중복되었습니다.' });
    keys.add(key);
    round.stops.forEach((stop, s) => {
      if (s && stop.time < round.stops[s - 1].time) ctx.addIssue({ code: 'custom', path: ['rounds', r, 'stops', s, 'time'], message: '정류장 시각은 운행 순서대로 입력해주세요.' });
    });
  });
});
export type CancellationRule = z.infer<typeof ruleSchema>;
export type RuleRecord = { id: string; version: number; updatedAt: string; rule: CancellationRule };
export const newRule = (): CancellationRule => ({ name: '', season: 'ALL', day: 'ALL', matchMode: 'ANY', note: '', conditions: [{ fromPort: '', toPort: '', time: '', basis: 'DEPARTURE' }], alternatives: [], rounds: [] });
export const newRound = (): CancellationRule['rounds'][number] => ({ key: crypto.randomUUID(), vehicleId: '', roundNo: 1, sourceRouteId: '', routeName: '', note: '', ferryInfo: '', stops: [] });
