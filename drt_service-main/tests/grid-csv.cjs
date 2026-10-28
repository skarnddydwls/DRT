const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/lib/gridCsv.ts'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const output = {};
new Function('exports', js)(output);

test('export uses current visible columns, filtered/sorted rows and formatted values; adds UTF-8 BOM', () => {
  const columns = [{ id: 'time' }, { id: 'status' }];
  const api = {
    getAllDisplayedColumns: () => columns,
    getDisplayNameForColumn: () => '알림시각',
    getDataAsCsv: (options) => {
      assert.equal(options.exportedRows, 'filteredAndSorted');
      assert.equal(options.onlySelected, false);
      assert.equal(options.skipPinnedBottom, true);
      assert.equal(options.suppressQuotes, false);
      assert.equal(options.columnKeys, columns);
      assert.equal(options.processCellCallback({ value: 1791966618194, formatValue: () => '2026-10-14 17:30:18' }), '2026-10-14 17:30:18');
      assert.equal(options.processCellCallback({ value: 'QUEUED', formatValue: () => '발송 대기' }), '발송 대기');
      assert.equal(options.processHeaderCallback({ column: columns[0] }), '알림시각');
      return '"알림시각","발송상태"\r\n"2026-10-14 17:30:18","발송 대기"';
    },
  };
  assert.ok(output.currentGridCsv(api).startsWith('\uFEFF"알림시각"'));
});
test('untrusted cells cannot become spreadsheet formulas; normal punctuation/Korean preserved', () => {
  for (const value of ['=1+1', '+cmd', '-cmd', '@SUM(A1)', '  =1', '\t=1']) assert.ok(output.safeCsvCell(value).startsWith("'"));
  assert.equal(output.safeCsvCell('안내, "본문"\n두 번째 줄'), '안내, "본문"\n두 번째 줄');
  assert.equal(output.safeCsvCell(null), '');
  assert.equal(output.safeCsvCell(123), '123');
});
