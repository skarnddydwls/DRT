import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateAttractionDraft } from '../src/features/tourism/validateDraft.ts';
const valid = { name: '항구', category: '관광지', display_order: 0 };
test('필수값 누락은 저장 버튼 옆에 표시할 오류를 반환한다', () => {
  assert.match(validateAttractionDraft('', valid), /정류장/);
  assert.match(validateAttractionDraft('ST01', { ...valid, name: ' ' }), /장소명/);
  assert.match(validateAttractionDraft('ST01', { ...valid, category: ' ' }), /분류/);
});
test('잘못된 표시 순서는 명시적으로 거부하고 정상값은 저장한다', () => {
  for (const display_order of [-1, 10000, 0.5, NaN]) assert.match(validateAttractionDraft('ST01', { ...valid, display_order }), /표시 순서/);
  assert.equal(validateAttractionDraft('ST01', valid), null);
});
