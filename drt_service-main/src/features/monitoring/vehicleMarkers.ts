import {
  Feature,
  Icon,
  Point,
  Style,
  VectorSource,
  fromLonLat,
} from "@/lib/maps/kakaoMap";
import { vehicleCoordinates } from "@/lib/maps/vehicleCoordinates";
import type { VehicleMarker } from "@/types/monitoring";

// 차량 갱신 모드 (snapshot: 전체 교체, delta: 부분 갱신)
export type VehicleUpdateMode = "snapshot" | "delta";

// 차량 마커 위 상태 배지 종류
export type VehicleStatusBadgeVariant = "start" | "end";

// 운행 시작/종료 상단 알림 및 버스 위 시작 배지 표시 시간 (ms)
export const OPERATION_NOTICE_DURATION_MS = 3000;

// 운행 종료(end) 수신 후 버스 위 종료 배지 유지 및 마커 제거 대기 시간 (ms)
export const VEHICLE_END_REMOVAL_DELAY_MS = 3000;

// 탭 새로고침 시 종료된 차량이 DB 스냅샷에서 재등장하지 않도록 막는 sessionStorage 키
const ENDED_VEHICLE_WATERMARK_KEY = "drt:monitoring:ended-vehicles";
// 종료 워터마크 최대 보관 시간 (백엔드 스냅샷 유지 창보다 넉넉하게 15분)
const ENDED_WATERMARK_TTL_MS = 15 * 60 * 1000;

type EndedVehicleWatermark = {
  endedAt: number;
  // 최초 REST 스냅샷에서 관측한 DB 기준 oper_dtm (DB-브라우저 Clock Skew 제거용)
  suppressedOperDtm: number | null;
};

function readEndedVehicleWatermarks(): Record<string, EndedVehicleWatermark> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(ENDED_VEHICLE_WATERMARK_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const now = Date.now();
    const result: Record<string, EndedVehicleWatermark> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "number" && Number.isFinite(value)) {
        if (now - value <= ENDED_WATERMARK_TTL_MS) {
          result[key] = { endedAt: value, suppressedOperDtm: null };
        }
      } else if (value && typeof value === "object" && !Array.isArray(value)) {
        const record = value as Record<string, unknown>;
        const endedAt = Number(record.endedAt);
        const suppressed =
          record.suppressedOperDtm == null
            ? null
            : Number(record.suppressedOperDtm);
        if (
          Number.isFinite(endedAt) &&
          now - endedAt <= ENDED_WATERMARK_TTL_MS &&
          (suppressed === null || Number.isFinite(suppressed))
        ) {
          result[key] = { endedAt, suppressedOperDtm: suppressed };
        }
      }
    }
    return result;
  } catch {
    return {};
  }
}

function writeEndedVehicleWatermarks(
  map: Record<string, EndedVehicleWatermark>
): void {
  if (typeof window === "undefined") return;
  try {
    if (Object.keys(map).length === 0) {
      window.sessionStorage.removeItem(ENDED_VEHICLE_WATERMARK_KEY);
    } else {
      window.sessionStorage.setItem(
        ENDED_VEHICLE_WATERMARK_KEY,
        JSON.stringify(map)
      );
    }
  } catch {
    // 프라이빗 모드 또는 스토리지 용량 제한 시 안전하게 무시
  }
}

// 운행 종료(end) 수신 워터마크 기록
export function markVehicleEnded(vehicleId: string, operDtm?: number): void {
  void operDtm;
  const watermarks = readEndedVehicleWatermarks();
  watermarks[vehicleId] = {
    endedAt: Date.now(),
    suppressedOperDtm: null,
  };
  writeEndedVehicleWatermarks(watermarks);
}

// 운행 재시작(start) 시 종료 워터마크 해제
export function clearVehicleEnded(vehicleId: string): void {
  const watermarks = readEndedVehicleWatermarks();
  if (!(vehicleId in watermarks)) return;
  delete watermarks[vehicleId];
  writeEndedVehicleWatermarks(watermarks);
}

// REST 스냅샷 응답에서 이미 종료 처리된 과거 로그 제외 (DB 자체 oper_dtm 기준으로 비교해 Clock Skew 무관)
export function filterEndedSnapshotVehicles(
  vehicles: VehicleMarker[]
): VehicleMarker[] {
  const watermarks = readEndedVehicleWatermarks();
  if (Object.keys(watermarks).length === 0) return vehicles;

  let dirty = false;
  const filtered = vehicles.filter((vehicle) => {
    const entry = watermarks[vehicle.vehicle_id];
    if (!entry) return true;

    const operDtm = Number(vehicle.oper_dtm);
    if (!Number.isFinite(operDtm)) return false;

    // 종료 직후 처음 만나는 DB 스냅샷의 oper_dtm을 DB 기준선으로 고정하고 숨김
    if (entry.suppressedOperDtm === null) {
      entry.suppressedOperDtm = operDtm;
      dirty = true;
      return false;
    }

    // DB 기준선 이하의 과거/동일 로그는 계속 숨김
    if (operDtm <= entry.suppressedOperDtm) {
      return false;
    }

    // DB 기준선보다 확실히 새로운 로그가 들어왔다면 신규 운행으로 간주하고 워터마크 해제
    delete watermarks[vehicle.vehicle_id];
    dirty = true;
    return true;
  });

  if (dirty) writeEndedVehicleWatermarks(watermarks);
  return filtered;
}

// AG-Grid 표시용 차량 행 타입
export type VehicleGridRow = VehicleMarker & {
  route_nm: string;
  route_id: string;
  [key: string]: unknown;
};

// 차량 위치 데이터를 vehicle_id 기준으로 병합
export function mergeVehicleMarkers(
  current: Record<string, VehicleMarker>,
  incoming: VehicleMarker[],
  mode: VehicleUpdateMode
): {
  nextVehicles: Record<string, VehicleMarker>;
  updatedVehicles: VehicleMarker[];
} {
  // 수신 배열 내 중복 vehicle_id를 최신 oper_dtm 기준으로 정리
  const latestIncoming = incoming.reduce((acc, vehicle) => {
    const existing = acc[vehicle.vehicle_id];
    if (!existing || vehicle.oper_dtm >= existing.oper_dtm) {
      acc[vehicle.vehicle_id] = vehicle;
    }
    return acc;
  }, {} as Record<string, VehicleMarker>);

  if (mode === "snapshot") {
    return {
      nextVehicles: latestIncoming,
      updatedVehicles: Object.values(latestIncoming),
    };
  }

  // 기존 차량 상태를 유지하면서 더 최신 oper_dtm인 차량만 부분 갱신
  const nextVehicles: Record<string, VehicleMarker> = { ...current };
  const updatedVehicles: VehicleMarker[] = [];

  Object.values(latestIncoming).forEach((vehicle) => {
    const existing = nextVehicles[vehicle.vehicle_id];
    if (!existing || vehicle.oper_dtm >= existing.oper_dtm) {
      nextVehicles[vehicle.vehicle_id] = vehicle;
      updatedVehicles.push(vehicle);
    }
  });

  return { nextVehicles, updatedVehicles };
}

// 병합된 차량 맵을 AG-Grid 행 배열로 변환
export function buildVehicleGridRows(
  vehicles: Record<string, VehicleMarker>,
  routeNames: Record<string, string>,
  routeIds: Record<string, string>
): VehicleGridRow[] {
  return Object.values(vehicles).map((vehicle) => ({
    ...vehicle,
    route_nm: vehicle.route_nm ?? routeNames[vehicle.vehicle_id] ?? "-",
    route_id: vehicle.route_id || routeIds[vehicle.vehicle_id] || "",
  }));
}

// 모든 차량 마커에 걸린 이동 애니메이션(rAF) 일괄 취소
export function cancelVehicleAnimations(vehicleSource: VectorSource): void {
  vehicleSource.getFeatures().forEach((feature) => {
    const animationFrame = feature.get("animation_frame") as number | undefined;
    if (animationFrame != null) {
      cancelAnimationFrame(animationFrame);
      feature.unset("animation_frame", true);
    }
  });
}

// 특정 차량 마커의 이동 애니메이션(rAF)만 정지
export function stopVehicleAnimation(
  vehicleSource: VectorSource,
  vehicleId: string
): void {
  vehicleSource.getFeatures().forEach((feature) => {
    if (String(feature.get("vehicle_id")) === vehicleId) {
      const animationFrame = feature.get("animation_frame") as number | undefined;
      if (animationFrame != null) {
        cancelAnimationFrame(animationFrame);
        feature.unset("animation_frame", true);
      }
    }
  });
}

// 운행 종료(end)된 차량의 마커·애니메이션·상태를 지도와 맵에서 제거
// expectedToken이 지정되면 해당 토큰과 일치하는 피처만 제거해 재출발(start) 경합을 방지
export function removeVehicleMarker(
  vehicleSource: VectorSource,
  current: Record<string, VehicleMarker>,
  vehicleId: string,
  expectedToken?: string
): Record<string, VehicleMarker> {
  const matchedFeatures = vehicleSource
    .getFeatures()
    .filter((feature) => String(feature.get("vehicle_id")) === vehicleId);

  if (expectedToken !== undefined) {
    const hasMatchingToken = matchedFeatures.some(
      (feature) => feature.get("status_badge_token") === expectedToken
    );
    if (!hasMatchingToken) return current;
  }

  matchedFeatures.forEach((feature) => {
    if (
      expectedToken !== undefined &&
      feature.get("status_badge_token") !== expectedToken
    ) {
      return;
    }
    const animationFrame = feature.get("animation_frame") as number | undefined;
    if (animationFrame != null) cancelAnimationFrame(animationFrame);
    vehicleSource.removeFeature(feature);
  });

  if (!(vehicleId in current)) return current;
  const nextVehicles = { ...current };
  delete nextVehicles[vehicleId];
  return nextVehicles;
}

// 차량 마커 위에 상태 배지(예: "운행 시작" / "운행 종료") 표시 (토큰으로 경합 방지)
export function setVehicleStatusBadge(
  vehicleSource: VectorSource,
  vehicleId: string,
  label: string,
  token: string,
  variant: VehicleStatusBadgeVariant = "start"
): void {
  vehicleSource.getFeatures().forEach((feature) => {
    if (String(feature.get("vehicle_id")) === vehicleId) {
      feature.set("status_badge_token", token, true);
      feature.set("status_badge_variant", variant, true);
      feature.set("status_badge", label);
    }
  });
}

// 동일 토큰으로 등록된 차량 마커 상태 배지만 안전하게 제거
export function clearVehicleStatusBadge(
  vehicleSource: VectorSource,
  vehicleId: string,
  token: string
): void {
  vehicleSource.getFeatures().forEach((feature) => {
    if (
      String(feature.get("vehicle_id")) === vehicleId &&
      feature.get("status_badge_token") === token
    ) {
      feature.unset("status_badge_token", true);
      feature.unset("status_badge_variant", true);
      feature.unset("status_badge");
    }
  });
}

// 기존 마커 Icon 재사용 (이미지 src가 달라질 때만 새로 생성)
function getOrCreateVehicleIcon(
  feature: Feature,
  iconSrc: string,
  initialRotationRad: number
): Icon {
  const existingImage = feature.getStyle()?.options.image;
  if (existingImage instanceof Icon && existingImage.options.src === iconSrc) {
    return existingImage;
  }

  const vehicleIcon = new Icon({
    src: iconSrc,
    scale: 0.3,
    rotation: initialRotationRad,
    anchor: [0.5, 0.5],
  });
  feature.setStyle(new Style({ image: vehicleIcon }));
  return vehicleIcon;
}

// 지도 벡터 소스의 차량 마커 위치·방향·속성 동기화
export function syncVehicleMarkerFeatures(
  vehicleSource: VectorSource,
  vehiclesToRender: VehicleMarker[],
  options: {
    mode: VehicleUpdateMode;
    moveDurationMs: number;
  }
): void {
  const { mode, moveDurationMs } = options;
  const existingFeatures = vehicleSource.getFeatures();
  const existingFeaturesById = Object.fromEntries(
    existingFeatures.map((feature) => [String(feature.get("vehicle_id")), feature])
  ) as Record<string, Feature>;
  const renderedVehicleIds = new Set<string>();

  vehiclesToRender.forEach((vehicle) => {
    const location = vehicleCoordinates(vehicle);
    if (!location) return;

    renderedVehicleIds.add(vehicle.vehicle_id);
    const coord = fromLonLat(location);
    const existingFeature = existingFeaturesById[vehicle.vehicle_id];
    const feature = existingFeature ?? new Feature();
    const previousGeometry = feature.getGeometry();
    const previousCoord =
      previousGeometry instanceof Point
        ? previousGeometry.getCoordinates().slice()
        : null;

    const targetHeading = Number(vehicle.heading) || 0;
    const previousHeadingValue = Number(feature.get("display_heading"));
    const previousHeading = Number.isFinite(previousHeadingValue)
      ? previousHeadingValue
      : targetHeading;
    // 359° → 1° 같은 경우 반대 방향으로 돌지 않도록 최단 회전 각도 계산
    const headingDelta = ((targetHeading - previousHeading + 540) % 360) - 180;
    const iconSrc =
      vehicle.vehicle_id === "VH00000002" ? "/bus2.png" : "/bus.png";
    const vehicleIcon = getOrCreateVehicleIcon(
      feature,
      iconSrc,
      (previousHeading * Math.PI) / 180
    );

    // 이전 이동 애니메이션이 남아 있으면 취소 후 새 좌표로 전환
    const previousAnimationFrame = feature.get("animation_frame") as
      | number
      | undefined;
    if (previousAnimationFrame != null) {
      cancelAnimationFrame(previousAnimationFrame);
    }

    // 지연 삭제 대기 중인 "운행 종료" 배지가 있는 차량에 새 위치가 들어오면 종료 상태 해제
    if (feature.get("status_badge_variant") === "end") {
      feature.unset("status_badge_token", true);
      feature.unset("status_badge_variant", true);
      feature.unset("status_badge", true);
    }

    // 이전 좌표가 있으면 부드럽게 이동 보간, 없으면 즉시 배치
    if (previousCoord && moveDurationMs > 0) {
      const geometry = previousGeometry as Point;
      const startedAt = performance.now();
      const animate = (now: number) => {
        const progress = Math.min((now - startedAt) / moveDurationMs, 1);
        const eased = progress * progress * (3 - 2 * progress);
        geometry.setCoordinates([
          previousCoord[0] + (coord[0] - previousCoord[0]) * eased,
          previousCoord[1] + (coord[1] - previousCoord[1]) * eased,
        ]);
        const displayedHeading =
          (previousHeading + headingDelta * eased + 360) % 360;
        vehicleIcon.setRotation((displayedHeading * Math.PI) / 180);
        feature.set("display_heading", displayedHeading, true);
        if (progress < 1) {
          feature.set(
            "animation_frame",
            requestAnimationFrame(animate),
            true
          );
        } else {
          feature.unset("animation_frame", true);
        }
      };
      feature.set("animation_frame", requestAnimationFrame(animate), true);
    } else {
      if (previousGeometry instanceof Point) {
        previousGeometry.setCoordinates(coord);
      } else {
        feature.setGeometry(new Point(coord));
      }
      vehicleIcon.setRotation((targetHeading * Math.PI) / 180);
      feature.set("display_heading", targetHeading, true);
    }

    // 툴팁·클릭 이벤트에서 사용할 차량 메타데이터 갱신
    feature.setProperties({
      feature_kind: "vehicle",
      vehicle_id: vehicle.vehicle_id,
      vehicle_no: vehicle.vehicle_no,
      oper_dtm: vehicle.oper_dtm,
      heading: vehicle.heading,
      speed: vehicle.speed,
    });

    if (!existingFeature) {
      vehicleSource.addFeature(feature);
    }
  });

  // snapshot 모드에서만 이번 목록에 없는 차량 마커 제거
  if (mode === "snapshot") {
    existingFeatures.forEach((feature) => {
      const vehicleId = String(feature.get("vehicle_id"));
      if (!renderedVehicleIds.has(vehicleId)) {
        const animationFrame = feature.get("animation_frame") as
          | number
          | undefined;
        if (animationFrame != null) cancelAnimationFrame(animationFrame);
        vehicleSource.removeFeature(feature);
      }
    });
  }
}
