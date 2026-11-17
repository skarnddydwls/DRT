import assert from 'node:assert/strict';
import { test } from 'node:test';
import { allowCenterRequest } from '../src/features/tourism/requestOrigin.ts';
const allowed = 'http://1.241.174.98:3000';
test('등록한 외부 센터의 동일 출처 요청과 기존 로컬 접속을 허용한다', () => {
  assert.equal(allowCenterRequest(allowed, '1.241.174.98:3000', 'http:', allowed), true);
  assert.equal(allowCenterRequest('http://localhost:3000', 'localhost:3000', 'http:'), true);
  assert.equal(allowCenterRequest('http://127.0.0.1:3000', 'localhost:3000', 'http:'), true);
});
test('다른 사이트·다른 포트·출처 누락·미등록 외부 센터는 차단한다', () => {
  for (const origin of ['http://evil.example:3000', 'http://1.241.174.98:8082', 'null', null, `${allowed}/other`, 'http://evil@1.241.174.98:3000']) {
    assert.equal(allowCenterRequest(origin, '1.241.174.98:3000', 'http:', allowed), false);
  }
  assert.equal(allowCenterRequest(allowed, '1.241.174.98:3000', 'http:'), false);
  assert.equal(allowCenterRequest(allowed, 'evil.example:3000', 'http:', allowed), false);
});
