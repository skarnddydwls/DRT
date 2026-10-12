import assert from 'node:assert/strict';
import { test } from 'node:test';
import { allowTourismRequest } from '../src/features/tourism/requestOrigin.ts';
test('센터 Host 기준으로 같은 포트의 로컬 주소를 허용한다', () => {
  for (const origin of ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://[::1]:3000']) assert.equal(allowTourismRequest(origin, 'localhost:3000', 'http:'), true);
  assert.equal(allowTourismRequest('http://127.0.0.1:8080', '127.0.0.1:8080', 'http:'), true);
  assert.equal(allowTourismRequest(null, 'localhost:3000', 'http:'), true);
});
test('외부 출처·다른 포트·잘못된 주소는 계속 차단한다', () => {
  for (const origin of ['http://evil.example:3000', 'http://localhost:8082', 'https://localhost:3000', 'null', 'http://localhost:3000/other', 'http://evil.example@localhost:3000']) assert.equal(allowTourismRequest(origin, 'localhost:3000', 'http:'), false);
  assert.equal(allowTourismRequest(null, 'evil.example:3000', 'http:'), false);
});
