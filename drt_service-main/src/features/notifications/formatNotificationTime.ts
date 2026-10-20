/** Normalize JDBC epoch milliseconds to Korea-local display/filter time. */
export function formatNotificationTime(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  const text = String(value).trim();
  // SQL timestamps without an offset already represent local wall-clock time.
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(text)) {
    return text.replace("T", " ").slice(0, 19);
  }
  const date = /^\d+$/.test(text) ? new Date(Number(text)) : new Date(text);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const part = (name: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === name)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")} ${part("hour")}:${part("minute")}:${part("second")}`;
}
