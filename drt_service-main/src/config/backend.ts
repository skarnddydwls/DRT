export const BACKEND_BASE_URL = (
  process.env.BACKEND_API_BASE_URL?.trim() || "http://localhost:8081/drt"
).replace(/\/+$/, "");
