import { post } from "@/lib/api/client";

export interface DetailCodeRow {
  common_code: string;
  detail_code: string;
  label?: string | null;
  value?: string | null;
  value_3?: string | null;
  remark?: string | null;
}

export interface DetailCodeResponse {
  codes: DetailCodeRow[];
  total: number;
}

export async function getDetailCodes(
  commonCode: string
): Promise<DetailCodeResponse> {
  return post<DetailCodeResponse>("/api/detail-code", {
    COMMON_CODE: commonCode,
  });
}
