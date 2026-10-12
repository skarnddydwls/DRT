/**
 * 백엔드 API 설정
 * 환경 변수나 기본값을 통해 백엔드 URL을 관리합니다.
 */

/**
 * 백엔드 API 기본 URL
 * 환경 변수 BACKEND_API_BASE_URL이 설정되어 있으면 사용하고,
 * 없으면 기본 개발 서버 URL을 사용합니다.
 */
// export const BACKEND_BASE_URL =
//   process.env.BACKEND_API_BASE_URL || "http://192.168.111.152:8081/drt";
//"http://1.241.174.98:8386/drt";
// export const BACKEND_BASE_URL = "http://192.168.111.152:8081/drt";
export const BACKEND_BASE_URL = "http://localhost:8081/drt";
