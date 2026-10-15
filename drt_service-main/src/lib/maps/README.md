# 센터 지도

모든 활성 지도 화면은 Kakao Maps JavaScript SDK를 사용한다.

- `kakaoLoader.ts`: 공개 JavaScript 키 `NEXT_PUBLIC_KAKAO_MAP_KEY`로 SDK를 한 번만 로드한다.
- `kakaoMap.ts`: 기존 화면의 feature/source/view 이벤트 계약을 유지하는 전환 계층이다.
  OpenLayers나 VWorld 타일은 사용하지 않는다. 실제 렌더러는 Kakao Map, Polyline, CustomOverlay다.
- 좌표는 `[경도, 위도]`다. 호환 함수 `fromLonLat`도 투영 변환하지 않고 숫자 좌표만 정규화한다.
- 기존 화면의 줌 숫자는 `kakaoLevel`에서 카카오 레벨(작을수록 확대)로 변환한다.
- 위치/방향 갱신은 기존 오버레이와 이미지 DOM을 재사용한다. 정류장 툴팁은 z-index 1000이다.
- 컴포넌트 크기가 바뀌면 `relayout()`을 호출하고 중심을 유지한다.
- 페이지 종료 시 이벤트, ResizeObserver, 소스 구독과 오버레이를 정리한다.

노선편집은 기존 직접 SDK 컴포넌트를 유지하며 공통 로더를 공유한다.
SDK 실패 시 오류를 표시하고 다른 지도 서비스로 자동 대체하지 않는다.

검증: `node --test tests/kakao-map.cjs` (프로젝트 루트에서 실행).
