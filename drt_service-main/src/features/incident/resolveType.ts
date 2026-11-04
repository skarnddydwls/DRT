import type { IncidentRow } from "@/types/incident";
import type { DetailCodeRow } from "@/lib/api/common";

/** Resolve legacy code-only responses too; never show an internal code as a type name. */
export function resolveIncidentType(row: IncidentRow, codes: DetailCodeRow[]): IncidentRow {
  const raw = row.incident_type;
  const code = row.incident_type_code || codes.find((item) => item.detail_code === raw)?.detail_code || (/^CD\d{3}$/.test(raw) ? raw : "");
  const label = codes.find((item) => item.detail_code === code)?.label;
  return { ...row, incident_type_code: code, incident_type: label || (raw && raw !== code ? raw : "종류명 확인 필요") };
}
