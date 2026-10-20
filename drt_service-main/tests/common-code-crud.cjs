// Explicit integration test: creates ONLY a unique temporary parent/child, then removes them.
// Run against a local development center: node tests/common-code-crud.cjs
const assert = require('node:assert/strict');
const base = process.env.CENTER_TEST_URL || 'http://127.0.0.1:3000';
const common = 'ZT_' + require('node:crypto').randomBytes(7).toString('hex');
async function request(path, body, status = 200) {
  const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json();
  assert.equal(response.status, status, JSON.stringify(result));
  return result;
}
const payload = { common_code: common, common_code_name: 'CRUD integration test', detail_code: 'Z0001', value_1: 'test', value_2: '#123456', value_3: '', remark: 'Temporary test; deleted after verification', use_yn: 'Y' };
const manage = (kind, action, extra = {}, status = 200) => request('/api/common-code/manage', { ...payload, kind, action, ...extra }, status);
async function main() {
  let created = false;
  try {
    await manage('detail', 'create', {}, 404); // Missing parent.
    await manage('common', 'create', { common_code: 'X'.repeat(21) }, 400);
    await manage('common', 'create'); created = true;
    await manage('common', 'create', {}, 409);
    await manage('common', 'update', { common_code_name: 'Updated parent' });
    const parents = await request('/api/common-code', {});
    assert.equal(parents.codes.find(x => x.common_code === common).common_code_name, 'Updated parent');
    await manage('detail', 'create');
    await manage('detail', 'create', {}, 409);
    await manage('common', 'delete', {}, 409); // Must preserve both records.
    await manage('detail', 'update', { value_1: 'Updated child', use_yn: 'N' });
    const children = await request('/api/detail-code', { COMMON_CODE: common });
    assert.equal(children.codes.length, 1);
    assert.equal(children.codes[0].label, 'Updated child');
    assert.equal(children.codes[0].use_yn, 'N');
    await manage('detail', 'delete');
    await manage('detail', 'delete', {}, 404);
    await manage('common', 'delete'); created = false;
    const after = await request('/api/common-code', {});
    assert.ok(!after.codes.some(x => x.common_code === common));
    console.log('CRUD, duplicate/length/missing-parent checks, parent-delete guard, persistence and cleanup passed.');
  } finally {
    if (created) {
      // Only the uniquely named fixture from this invocation is ever deleted.
      try { await manage('detail', 'delete'); } catch {}
      await manage('common', 'delete');
      console.log('Temporary fixture cleaned: ' + common);
    }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
