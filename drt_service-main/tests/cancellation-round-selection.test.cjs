const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const m = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/cancellation-dispatch/roundSelection.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 } }).outputText, { module: m, exports: m.exports });
const { selectedRound } = m.exports;
test('호차 이름으로 차량을 추정하지 않고 실제 마스터 차량과 회차를 연결한다', () => {
  for (const n of [1, 2, 3]) {
    const result = selectedRound([{ route_id: `R${n}`, route_nm: `1호차_${n}`, vehicle_id: 'ACTUAL_VEHICLE' }], `R${n}`);
    assert.equal(result.roundNo, n);
    assert.equal(result.vehicleId, 'ACTUAL_VEHICLE');
    assert.equal(result.sourceRouteId, `R${n}`);
  }
});
test('미등록·여러 차량 지정·알 수 없는 회차는 임의 배정하지 않는다', () => {
  assert.throws(() => selectedRound([], 'R'), /호차/);
  assert.throws(() => selectedRound([{ route_id: 'R', route_nm: '1호차_1' }], 'R'), /차량/);
  assert.throws(() => selectedRound([{ route_id: 'R', route_nm: '1호차_1', vehicle_id: 'A' }, { route_id: 'R', route_nm: '1호차_1', vehicle_id: 'B' }], 'R'), /여러 대/);
});
