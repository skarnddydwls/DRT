const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/lib/maps/vehicleCoordinates.ts'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const output = {};
new Function('exports', code)(output);
test('vehicle API X is longitude and Y is latitude (live-response regression)', () => {
  assert.deepEqual(output.vehicleCoordinates({ gps_x: 126.948852, gps_y: 37.373843 }), [126.948852, 37.373843]);
  assert.deepEqual(output.vehicleCoordinates({ gps_x: '127.766968', gps_y: '34.512524' }), [127.766968, 34.512524]);
});
test('missing, malformed and reversed out-of-range coordinates are rejected', () => {
  for (const row of [{}, { gps_x: '', gps_y: 34 }, { gps_x: ' ', gps_y: 34 }, { gps_x: 127, gps_y: null }, { gps_x: 'bad', gps_y: 34 }, { gps_x: 34, gps_y: 127 }]) assert.equal(output.vehicleCoordinates(row), null);
});
