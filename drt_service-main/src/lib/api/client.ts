/**
 * 공통 API 클라이언트
 * 모든 외부 API 호출은 이 클라이언트를 통해 이루어집니다.
 */

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: unknown;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message?: string
  ) {
    super(message || `API Error: ${status} ${statusText}`);
    this.name = "ApiError";
  }
}

/**
 * 공통 헤더를 생성하는 함수
 * 쿠키, 인증 토큰 등을 추가할 수 있습니다
 */
function getDefaultHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  return headers;
}

/**
 * 공통 fetch 래퍼 함수
 * 에러 처리, 헤더, 타임아웃 등을 중앙에서 관리
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "POST", headers = {}, body } = options;

  const config: RequestInit = {
    method,
    headers: {
      ...getDefaultHeaders(),
      ...headers, // 개별 헤더는 기본 헤더를 덮어씁니다
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  };

  try {
    console.log("[apiClient] Fetching:", endpoint, "with config:", config);
    const response = await fetch(endpoint, config);
    console.log("[apiClient] Response status:", response.status, response.statusText);

    if (!response.ok) {
      throw new ApiError(
        response.status,
        response.statusText,
        `Failed to fetch ${endpoint}: ${response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new Error(
      `Network error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * GET 요청 헬퍼
 */
export async function get<T>(
  endpoint: string,
  headers?: Record<string, string>
) {
  return apiClient<T>(endpoint, { method: "GET", headers });
}

/**
 * POST 요청 헬퍼
 */
export async function post<T>(
  endpoint: string,
  body: unknown,
  headers?: Record<string, string>
) {
  return apiClient<T>(endpoint, { method: "POST", body, headers });
}

/**
 * PUT 요청 헬퍼
 */
export async function put<T>(
  endpoint: string,
  body: unknown,
  headers?: Record<string, string>
) {
  return apiClient<T>(endpoint, { method: "PUT", body, headers });
}

/**
 * DELETE 요청 헬퍼
 */
export async function del<T>(
  endpoint: string,
  headers?: Record<string, string>
) {
  return apiClient<T>(endpoint, { method: "DELETE", headers });
}
