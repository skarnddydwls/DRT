const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const moduleValue = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/cancellation-dispatch/model.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module: moduleValue, exports: moduleValue.exports, require });
const { ruleSchema, newRule } = moduleValue.exports;
const make = () => ({ name: '오전편 결항 대응', season: 'ALL', day: 'ALL', matchMode: 'ANY', note: '', conditions: [{ fromPort: '여수', toPort: '여천', time: '06:20', basis: 'DEPARTURE' }], alternatives: [{ fromPort: '신기', toPort: '여천', departureTime: '07:45', arrivalTime: '08:10' }], rounds: [{ key: 'one', vehicleId: 'VH1', roundNo: 1, sourceRouteId: '', routeName: '1호차_1', note: '', ferryInfo: '여천 출항 08:20', stops: [{ stationId: 'ST1', time: '07:18', reservationDiv: '', deadhead: true, remark: '공차회송' }, { stationId: 'ST2', time: '07:58', reservationDiv: 'CD001', deadhead: false, remark: '' }] }] });
test('결항·대체항로·반복 정류장·공차회송·예약구간 설정을 보존한다', () => {
  const rule = make(); rule.rounds[0].stops.push({ ...rule.rounds[0].stops[0], time: '08:00' });
  const result = ruleSchema.parse(rule);
  assert.equal(result.rounds[0].stops.length, 3);
  assert.equal(result.rounds[0].stops[0].deadhead, true);
  assert.equal(result.rounds[0].stops[1].reservationDiv, 'CD001');
  assert.equal(result.alternatives[0].arrivalTime, '08:10');
});
test('불완전한 새 규칙과 역전 시각은 저장할 수 없다', () => {
  assert.equal(ruleSchema.safeParse(newRule()).success, false);
  const rule = make(); rule.rounds[0].stops[1].time = '06:00';
  assert.equal(ruleSchema.safeParse(rule).success, false);
});
test('이전 모두 결항 설정을 불러와도 저장 결과는 하나라도 결항으로 고정한다', () => {
  const rule = make(); rule.matchMode = 'ALL';
  const result = ruleSchema.parse(rule);
  assert.equal(result.matchMode, 'ANY');
  assert.equal(result.alternatives.length, 1);
});
test('같은 차량·회차 중복, 잘못된 시각·누락 정류장 ID를 거부한다', () => {
  const duplicate = make(); duplicate.rounds.push({ ...duplicate.rounds[0], key: 'two' });
  assert.equal(ruleSchema.safeParse(duplicate).success, false);
  const invalid = make(); invalid.conditions[0].time = '24:00'; assert.equal(ruleSchema.safeParse(invalid).success, false);
  const missing = make(); missing.rounds[0].stops[0].stationId = ''; assert.equal(ruleSchema.safeParse(missing).success, false);
});
