# 전라남도 도서지역 특화 DRT — 운영·모니터링 웹

DRT(수요응답형 교통) **백오피스/모니터링용 웹 애플리케이션**입니다. 차량·노선·정류장·배차 데이터를 조회·편집하고, 지도 기반 모니터링과 통계·로그 화면을 제공합니다.

> **인수인계 시 주의:** 이 저장소(`drt_service`)는 **React Native가 아닌 Next.js 웹 프로젝트**입니다. 기억하신 “유저용·기사용 RN 앱을 한 레포에서 관리”하는 코드는 **다른 저장소**에 있을 가능성이 큽니다. 인수인계 전에 RN 앱 레포 경로·이름을 별도로 확인하시기 바랍니다.

---

## 목차

1. [한 줄 요약](#1-한-줄-요약)
2. [기술 스택](#2-기술-스택)
3. [폴더 구조](#3-폴더-구조)
4. [사전 요구사항](#4-사전-요구사항)
5. [프로젝트 설정 A to Z](#5-프로젝트-설정-a-to-z)
6. [환경 변수](#6-환경-변수)
7. [실행·빌드](#7-실행빌드)
8. [화면(라우트)과 역할](#8-화면라우트와-역할)
9. [백엔드 연동 구조](#9-백엔드-연동-구조)
10. [코드 작성 시 참고 패턴](#10-코드-작성-시-참고-패턴)
11. [부가 문서·에셋](#11-부가-문서에셋)
12. [배포·운영 시 체크리스트](#12-배포운영-시-체크리스트)
13. [알려진 이슈·개선 여지](#13-알려진-이슈개선-여지)

---

## 1. 한 줄 요약

| 항목 | 내용 |
|------|------|
| 프레임워크 | **Next.js 16** (App Router), **React 19**, **TypeScript** |
| UI | **Tailwind CSS 4**, **Radix UI**, **shadcn 스타일** 컴포넌트(`components.json`) |
| 그리드 | **AG Grid** |
| 지도 | **OpenLayers** + 브이월드(VWorld) 타일/키 |
| 서버 역할 | 브라우저가 직접 백엔드를 치지 않고, **Next API Route**가 Java/Spring 스타일 `*.do` API로 **프록시** |

`package.json`의 이름은 `web`이며, 내부 제품명은 레이아웃 메타데이터 기준 **「전라남도 도서지역 특화 DRT」**입니다.

---

## 2. 기술 스택

- **런타임·언어:** Node.js(권장 **20 LTS 이상**), TypeScript 5
- **웹:** Next 16, React 19, `next/font`(Geist)
- **스타일:** Tailwind 4, `tailwindcss-animate`, `class-variance-authority`, `clsx`, `tailwind-merge`
- **폼·검증:** `react-hook-form`, `@hookform/resolvers`, `zod`
- **차트:** `recharts`
- **기타:** `lucide-react`, `cmdk`

---

## 3. 폴더 구조

저장소 루트 기준입니다.

```
drt_service/
├── docs/                      # 기술 메모 (지도 경로 곡선 등)
├── public/                    # 정적 파일 (아이콘, 지도용 JSON, 버스 이미지 등)
├── src/
│   ├── app/                   # Next App Router
│   │   ├── layout.tsx         # 전역 헤더·푸터·메타
│   │   ├── page.tsx           # 랜딩(기능 카드 링크)
│   │   ├── globals.css
│   │   ├── api/               # 서버 라우트 → 백엔드 프록시
│   │   │   ├── calls/
│   │   │   ├── dispatch/
│   │   │   ├── markers/       # 정류장 더미 + 노드 등 (파일 용량 큼)
│   │   │   ├── route-nodes/
│   │   │   ├── routes/
│   │   │   ├── selectOperLogList/
│   │   │   ├── stats/
│   │   │   ├── stops/
│   │   │   ├── updatetime/
│   │   │   ├── vehicle-markers/
│   │   │   └── vehicles/      # insert, update, delete 하위 경로
│   │   ├── vehicle/           # 각 화면 page.tsx
│   │   ├── route/
│   │   ├── stop/
│   │   ├── dispatch/
│   │   ├── monitoring/
│   │   ├── marker/
│   │   ├── calls/
│   │   ├── selectOperLogList/
│   │   └── stats/
│   ├── components/            # 공통 UI (Grid, 지도, 모달 등)
│   │   └── ui/                # 버튼, 다이얼로그, 폼 컴포넌트 등
│   ├── config/
│   │   ├── backend.ts         # 백엔드 베이스 URL
│   │   └── vworld.ts          # 브이월드 API 키
│   ├── features/              # 화면별 AG Grid columnDefs, fieldconfig
│   ├── lib/
│   │   ├── api/               # 클라이언트에서 /api/* 호출 래퍼
│   │   └── utils.ts
│   └── types/                 # 도메인 타입 정의
├── components.json            # shadcn/ui 스타일 설정
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tailwind.config.js
└── tsconfig.json              # paths: "@/*" → "./src/*"
```

---

## 4. 사전 요구사항

- **Node.js** 20 이상 권장 (Next 16 공식 요구사항에 맞춤).
- **npm** (이 프로젝트는 `package-lock.json` 기준 **npm** 사용이 자연스럽습니다).
- DRT **백엔드 서버**가 동작하고, 아래 [환경 변수](#6-환경-변수)에 맞는 URL로부터 응답할 수 있어야 합니다.
- **지도:** 브이월드 타일/REST 사용 시 유효한 **VWorld API 키**가 필요합니다(운영 키는 저장소에 두지 마세요).

---

## 5. 프로젝트 설정 A to Z

### 5.1 저장소 받기

```bash
git clone <이-저장소-URL>
cd drt_service
```

### 5.2 의존성 설치

```bash
npm ci
```

처음이거나 lockfile이 없으면:

```bash
npm install
```

### 5.3 환경 설정

루트에 `.env.local`을 만들고 [환경 변수](#6-환경-변수)를 채웁니다. (Git에는 커밋되지 않습니다 — `.gitignore`에 `.env*` 포함.)

### 5.4 백엔드 URL 확인

`src/config/backend.ts`를 열어 **실제 연결할 백엔드 베이스 URL**이 맞는지 확인합니다. 현재 코드에는 과거 개발용 IP가 주석으로 남아 있고, **하드코딩된 운영/검증 URL**이 사용되는 형태입니다. 인수인계 시 **어느 환경을 바라보는지**를 반드시 문서화하거나, 가능하면 환경 변수만 쓰도록 정리하는 것을 권장합니다.

### 5.5 개발 서버 기동

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속.

### 5.6 품질 점검

```bash
npm run lint
```

---

## 6. 환경 변수

| 변수명 | 용도 | 비고 |
|--------|------|------|
| `BACKEND_API_BASE_URL` | 백엔드 API 베이스 URL | `backend.ts` 주석에 “설정 시 사용” 형태로 언급됨. **현재 활성 코드는 상수 하드코딩**이므로, 배포 전 실제 동작 값을 코드와 대조할 것. |
| `VWORLD_API_KEY` | 브이월드 API 키 | 미설정 시 `src/config/vworld.ts`의 **기본 키 문자열**이 사용됨. 운영에서는 반드시 환경 변수로 교체하고, 키 로테이션 정책을 정할 것. |

예시 `.env.local`:

```env
BACKEND_API_BASE_URL=http://your-backend-host:port/drt
VWORLD_API_KEY=your-vworld-key
```

> `backend.ts`를 환경 변수 우선으로 바꾸려면, `export const BACKEND_BASE_URL = process.env.BACKEND_API_BASE_URL ?? "fallback"` 형태로 정리하고 배포 파이프라인에 변수를 주입하면 됩니다.

---

## 7. 실행·빌드

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 (`next dev`) |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 빌드 결과 실행 (`build` 후) |
| `npm run lint` | ESLint |

프로덕션 예시:

```bash
npm run build
npm run start
```

기본 포트는 **3000**입니다. 변경 시 `next start -p <port>` 또는 플랫폼별 PORT 환경 변수를 사용합니다.

---

## 8. 화면(라우트)과 역할

글로벌 네비는 `src/app/layout.tsx` 헤더에 정의되어 있습니다.

| 경로 | 설명 |
|------|------|
| `/` | 서비스 소개 및 각 기능으로 이동하는 카드 |
| `/vehicle` | 차량 관리 (목록·등록/수정 등) |
| `/route` | 노선 관리 |
| `/stop` | 정류장 관리 |
| `/dispatch` | 배차 관리 |
| `/monitoring` | 지도 기반 모니터링 |
| `/marker` | 마커 관련 화면 |
| `/calls` | 호출 기록 |
| `/selectOperLogList` | 운행 로그 |
| `/stats` | 호출 통계 |

`SideBar.tsx`에도 동일 메뉴가 있으나, 레이아웃에서는 헤더 링크가 주 네비게이션입니다.

---

## 9. 백엔드 연동 구조

### 9.1 왜 API Route를 쓰는가

브라우저에서 외부 `http(s)://.../*.do`로 직접 `fetch`하면 **CORS**, **인증 헤더 공유**, **엔드포인트 은닉** 이슈가 생기기 쉽습니다. 이 프로젝트는 **서버 사이드**(`src/app/api/**/route.ts`)에서 백엔드로 `fetch`한 뒤, 클라이언트에는 JSON으로 내려주는 패턴입니다.

### 9.2 Next API → 백엔드 `.do` 매핑

클라이언트가 부르는 경로(예: `/api/vehicles`)와 실제 백엔드 엔드포인트 대응입니다. (`BACKEND_BASE_URL` 뒤에 붙는 경로)

| Next API 경로 | 백엔드 (예시) | 비고 |
|---------------|----------------|------|
| `POST /api/vehicles` | `.../selectVehicleList.do` | 차량 목록 |
| `POST /api/vehicles/insert` | `.../insertVehicle.do` | 차량 등록 |
| `POST /api/vehicles/update` | `.../updateVehicle.do` | 차량 수정 |
| `POST /api/vehicles/delete` | `.../deleteVehicle.do` | 차량 삭제 |
| `POST /api/routes` | `.../selectRouteList.do` | 노선 목록 |
| `POST /api/stops` | `.../selectStationList.do` | 정류장 목록 |
| `POST /api/dispatch` | `.../selectDispatchList.do` | 배차 목록 |
| `POST /api/route-nodes` | `.../selectRouteNode.do` | 노선 노드 |
| `POST /api/vehicle-markers` | `.../selectVehicleMarker.do` | 차량 마커 |
| `POST /api/calls` | `.../selectVehicleCallLogList.do` | 호출 로그 |
| `POST /api/stats` | `.../selectVehicleCallStatList.do` | 호출 통계 |
| `POST /api/selectOperLogList` | `.../selectOperLogList.do` | 운행 로그 |
| `POST /api/updatetime` | `.../updateDispatch.do` | 배차 시간 등 갱신 |
| `POST /api/markers` | `.../selectStationList.do`, `.../selectNodeList.do` | 마커용 데이터(파일 내 더미 정류장 포함 — 레거시 주석 참고) |

백엔드는 전형적인 **Spring MVC `@RequestMapping("*.do")"`** 형태로 추정됩니다. 정확한 스펙(요청/응답 JSON 필드)은 **백엔드 팀 문서 또는 Swagger**와 대조해야 합니다.

### 9.3 클라이언트 API 모듈

`src/lib/api/*.ts`가 화면에서 쓰는 `post`/`get` 래퍼(`src/lib/api/client.ts`)를 통해 **`/api/...` 상대 경로**로 호출합니다. 새 화면을 만들 때도 이 패턴을 따르면 됩니다.

---

## 10. 코드 작성 시 참고 패턴

- **경로 별칭:** `@/components/...`, `@/lib/...` 등 (`tsconfig.json`의 `paths`).
- **그리드 컬럼:** 화면별로 `src/features/<도메인>/columnDefs.ts`, `fieldconfig.ts`에 분리.
- **타입:** `src/types/<도메인>.ts`에 맞춰 두는 편.
- **지도:** `src/components/VWorldMap.tsx`, 설정은 `src/config/vworld.ts`.
- **공통 그리드 래퍼:** `src/components/Grid.tsx`.

---

## 11. 부가 문서·에셋

- `docs/smooth-route-curve.md` — 노선을 지도에 그릴 때 **Catmull-Rom 스플라인**으로 경로를 부드럽게 하는 배경·수식·의도 정리.
- `public/nodes.json`, `public/links.json` 등 — 지도/네트워크 시각화용 정적 데이터(용도는 `VWorldMap` 및 관련 로직 참고).

---

## 12. 배포·운영 시 체크리스트

- [ ] `BACKEND_BASE_URL`이 **배포 환경(개발/스테이징/운영)**에 맞는지 확인.
- [ ] `VWORLD_API_KEY`를 **환경 변수**로 주입하고, 저장소 기본 키 의존 제거 검토.
- [ ] 백엔드 장애 시 API Route가 반환하는 HTTP 상태·에러 메시지가 프론트에서 적절히 처리되는지 확인.
- [ ] HTTPS 배포 시 혼합 콘텐츠(HTTP 백엔드 호출) 제한 여부 확인 — 필요 시 백엔드도 TLS 또는 동일 사이트 프록시.
- [ ] `src/app/api/markers/route.ts`는 **대용량 더미 데이터**를 포함합니다. 유지보수 시 빌드 크기·가독성·실데이터 전환 계획을 논의할 것.

---

## 13. 알려진 이슈·개선 여지

1. **저장소 정체성:** RN 유저/기사 앱과 **동일 레포가 아님**. 모바일 앱 인수인계는 별도 저장소를 찾아야 함.
2. **백엔드 URL:** 환경 변수 주석과 실제 **하드코딩 URL**이 공존 — 혼선·보안 측면에서 정리 권장.
3. **API 키:** VWorld 기본 키가 코드에 있음 — 운영 반입 전 분리 필수.
4. **로깅:** `apiClient` 등에 `console.log`가 있어 프로덕션에서는 로그 레벨·마스킹 정책을 정하는 것이 좋음.

---

## 문의가 갈 만한 이해관계자

| 주제 | 확인 대상 |
|------|-----------|
| `*.do` API 스펙, DB, 배포 서버 | DRT **백엔드** 담당 |
| 브이월드 쿼터·키·도메인 제한 | **공간정보/지도** 담당 |
| 사업 범위·화면 요구사항 | **사업/기획** 또는 도청 담당 부서 |

---

이 README는 저장소 트리와 설정 파일을 기준으로 작성되었습니다. 백엔드 URL·키는 **반드시 현재 운영 기준으로 재검증**한 뒤 인수인계 자료에 반영하시기 바랍니다.
