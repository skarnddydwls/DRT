export function cn(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

/**
 * 밀리초 타임스탬프를 YYYY-MM-DD 형식의 날짜 문자열로 변환
 * @param timestamp 밀리초 타임스탬프 (number)
 * @param format 날짜 형식 (기본값: 'YYYY-MM-DD')
 * @returns 포맷된 날짜 문자열
 */
export function formatTimestamp(
  timestamp: number | string | null | undefined,
  format: string = "YYYY-MM-DD"
): string {
  if (timestamp == null) return "";

  const timestampNum =
    typeof timestamp === "string" ? Number(timestamp) : timestamp;

  // 유효하지 않은 숫자인 경우
  if (isNaN(timestampNum) || timestampNum <= 0) return "";

  const date = new Date(timestampNum);

  // 유효하지 않은 날짜인 경우
  if (isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  switch (format) {
    case "YYYY-MM-DD":
      return `${year}-${month}-${day}`;
    case "YYYY-MM-DD HH:mm":
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    case "YYYY-MM-DD HH:mm:ss":
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    case "HH:mm":
      return `${hours}:${minutes}`;
    case "HH:mm:ss":
      return `${hours}:${minutes}:${seconds}`;
    case "YYYY/MM/DD":
      return `${year}/${month}/${day}`;
    default:
      return `${year}-${month}-${day}`;
  }
}
