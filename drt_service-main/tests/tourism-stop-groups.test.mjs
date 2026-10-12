import assert from 'node:assert/strict';
import { test } from 'node:test';
import { groupTourismStops } from '../src/features/tourism/stopGroups.ts';

test('같은 이름의 양방향 정류장은 검색 목록에 한 번만 표시한다', () => {
  const grouped = groupTourismStops([
    { stn_id: 'ST02', stn_nm: '여천', stn_no: '22', direction: '상행', gps_x: 127.5, gps_y: 34.5 },
    { stn_id: 'ST01', stn_nm: ' 여천 ', stn_no: '11', direction: '하행', gps_x: 127.6, gps_y: 34.6 },
    { stn_id: 'ST03', stn_nm: '소유', direction: '상행' },
  ]);
  assert.equal(grouped.length, 2);
  assert.equal(grouped[0].stn_nm, '여천');
  assert.equal(grouped[0].stn_id, 'ST01');
  assert.equal(grouped[0].gps_x, 127.6);
  assert.equal(grouped[0].direction, '양방향 공통');
  assert.equal(grouped[0].stn_no, '22, 11');
  assert.equal(grouped[1].direction, '상행');
});
test('같은 ID의 중복 응답과 빈 이름은 추가 그룹을 만들지 않는다', () => {
  const stop = { stn_id: 'ST01', stn_nm: '여천', direction: '상행' };
  assert.deepEqual(groupTourismStops([stop, stop, { stn_id: 'ST00', stn_nm: ' ' }]), [{ ...stop, stn_no: null }]);
});
test('대표 정류장 ID는 조회 순서에 영향을 받지 않는다', () => {
  const stops = [{ stn_id: 'ST02', stn_nm: '여천' }, { stn_id: 'ST01', stn_nm: '여천' }];
  assert.equal(groupTourismStops(stops)[0].stn_id, groupTourismStops([...stops].reverse())[0].stn_id);
});
