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
