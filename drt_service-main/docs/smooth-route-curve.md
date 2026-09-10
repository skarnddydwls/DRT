# 경로선 부드럽게 만들기 (Smooth Route Curve)

## 문제 상황

### 배경
대중교통 모니터링 시스템에서 노선 경로를 지도에 표시할 때, GPS 좌표 포인트들을 직선으로 연결하면 다음과 같은 문제가 발생했습니다:

1. **각진 경로**: 포인트 간 직선 연결로 인해 경로가 각지고 부자연스러움
2. **가독성 저하**: 실제 도로 경로와 다르게 보여 사용자 혼란
3. **시각적 품질 저하**: 전문적이지 않은 UI로 인한 사용자 경험 저하

### 기술적 요구사항
- GPS 좌표 배열을 부드러운 곡선으로 변환
- 원본 포인트를 정확히 통과하는 곡선 생성
- 실시간 렌더링 성능 고려
- 다양한 노선 수에 대응 가능한 확장성

## 해결 방안

### 선택한 알고리즘: Catmull-Rom 스플라인

**Catmull-Rom 스플라인**을 선택한 이유:
- ✅ 원본 포인트를 정확히 통과 (Interpolating Spline)
- ✅ 구현이 비교적 단순
- ✅ 부드러운 곡선 생성
- ✅ 실시간 렌더링에 적합한 성능

### 구현 상세

#### 1. 알고리즘 원리

Catmull-Rom 스플라인은 4개의 제어점(p0, p1, p2, p3)을 사용하여 p1과 p2 사이의 곡선을 생성합니다.

**수식:**
```
P(t) = 0.5 * [
  2 * P1 +
  (-P0 + P2) * t +
  (2*P0 - 5*P1 + 4*P2 - P3) * t² +
  (-P0 + 3*P1 - 3*P2 + P3) * t³
]
```

여기서:
- `t`: 0에서 1 사이의 매개변수
- `P0, P1, P2, P3`: 제어점 좌표

#### 2. 구현 코드

```typescript
/**
 * Catmull-Rom 스플라인으로 부드러운 곡선 생성
 * @param points 원본 좌표 배열
 * @param numPoints 각 세그먼트당 생성할 중간점 개수 (기본값: 10)
 * @returns 부드러운 곡선 좌표 배열
 */
const createSmoothCurve = (
  points: number[][],
  numPoints: number = 10
): number[][] => {
  if (points.length < 2) return points;
  if (points.length === 2) return points;

  const result: number[][] = [];
  result.push(points[0]); // 첫 번째 포인트

  // 각 세그먼트마다 곡선 생성
  for (let i = 0; i < points.length - 1; i++) {
    // Catmull-Rom 스플라인을 위한 4개 포인트
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : points[i + 1];

    // p1과 p2 사이의 곡선 생성
    for (let j = 1; j <= numPoints; j++) {
      const t = j / numPoints;
      const t2 = t * t;
      const t3 = t2 * t;

      // Catmull-Rom 스플라인 공식
      const x =
        0.5 *
        (2 * p1[0] +
          (-p0[0] + p2[0]) * t +
          (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
          (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const y =
        0.5 *
        (2 * p1[1] +
          (-p0[1] + p2[1]) * t +
          (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
          (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);

      result.push([x, y]);
    }
  }

  result.push(points[points.length - 1]); // 마지막 포인트
  return result;
};
```

#### 3. 적용 방법

```typescript
// 원본 좌표 배열
const rawCoordinates = sortedNodes.map((node) =>
  fromLonLat([node.gps_x, node.gps_y])
);

// 부드러운 곡선으로 변환
const smoothCoordinates = createSmoothCurve(rawCoordinates, 8);

// OpenLayers LineString으로 렌더링
const lineFeature = new Feature({
  geometry: new LineString(smoothCoordinates),
});
```

### 성능 최적화

1. **세그먼트당 점 개수 조절**: `numPoints` 파라미터로 곡선의 부드러움과 성능의 균형 조절
   - 기본값: 8개 (충분히 부드러우면서도 성능에 무리 없음)
   - 포인트가 많은 경우: 5-6개로 감소 가능
   - 고품질이 필요한 경우: 10-15개로 증가 가능

2. **경계 처리**: 
   - 첫 번째와 마지막 세그먼트는 가상의 포인트를 사용하여 자연스러운 곡선 생성
   - `p0 = i > 0 ? points[i-1] : points[i]` (첫 세그먼트)
   - `p3 = i < points.length - 2 ? points[i+2] : points[i+1]` (마지막 세그먼트)

## 결과

### Before (직선 연결)
- ❌ 각진 경로
- ❌ 부자연스러운 시각적 표현
- ❌ 실제 도로 경로와 불일치

### After (Catmull-Rom 스플라인)
- ✅ 부드러운 곡선 경로
- ✅ 자연스러운 시각적 표현
- ✅ 실제 도로 경로와 유사한 표현
- ✅ 원본 GPS 포인트 정확히 통과

## 기술 스택

- **언어**: TypeScript
- **라이브러리**: OpenLayers (지도 렌더링)
- **알고리즘**: Catmull-Rom Spline
- **적용 분야**: 대중교통 모니터링 시스템, GIS 애플리케이션

## 참고 자료

- [Catmull-Rom Spline - Wikipedia](https://en.wikipedia.org/wiki/Centripetal_Catmull%E2%80%93Rom_spline)
- [OpenLayers Documentation](https://openlayers.org/)


