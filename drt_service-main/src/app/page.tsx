export default function Home() {
  return (
    <section className="flex flex-col gap-8">
      <div className="rounded-lg border p-8 bg-white">
        <h2 className="text-2xl font-bold mb-2">전라남도 도서지역 특화 DRT</h2>
        <p className="text-muted-foreground">
          차량관리, 노선관리, 정류장관리, 일배차관리, 모니터링, 호출기록, 호출통계
          기능을 제공하는 버스 모니터링/운영 서비스입니다.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <a
          href="/vehicle"
          className="block rounded-lg border p-6 bg-white hover:shadow">
          <h3 className="font-semibold mb-1">차량관리</h3>
          <p className="text-sm text-muted-foreground">
            차량 기본 정보 및 상태 관리 (ag-Grid)
          </p>
        </a>
        <a
          href="/route"
          className="block rounded-lg border p-6 bg-white hover:shadow">
          <h3 className="font-semibold mb-1">노선관리</h3>
          <p className="text-sm text-muted-foreground">
            노선 정보/구간 관리 (ag-Grid)
          </p>
        </a>
        <a
          href="/stop"
          className="block rounded-lg border p-6 bg-white hover:shadow">
          <h3 className="font-semibold mb-1">정류장관리</h3>
          <p className="text-sm text-muted-foreground">
            정류장 정보 관리 (ag-Grid)
          </p>
        </a>
        <a
          href="/dispatch"
          className="block rounded-lg border p-6 bg-white hover:shadow">
          <h3 className="font-semibold mb-1">일배차관리</h3>
          <p className="text-sm text-muted-foreground">
            배차 계획/이력 관리 (ag-Grid)
          </p>
        </a>
        <a
          href="/monitoring"
          className="block rounded-lg border p-6 bg-white hover:shadow">
          <h3 className="font-semibold mb-1">모니터링</h3>
          <p className="text-sm text-muted-foreground">
            지도에서 버스 이동경로 실시간 표출
          </p>
        </a>
        <a
          href="/calls"
          className="block rounded-lg border p-6 bg-white hover:shadow">
          <h3 className="font-semibold mb-1">호출기록</h3>
          <p className="text-sm text-muted-foreground">
            호출 이력 조회 (ag-Grid)
          </p>
        </a>
        <a
          href="/stats"
          className="block rounded-lg border p-6 bg-white hover:shadow">
          <h3 className="font-semibold mb-1">호출통계</h3>
          <p className="text-sm text-muted-foreground">
            차트 기반 호출 통계 시각화
          </p>
        </a>
      </div>
    </section>
  );
}
