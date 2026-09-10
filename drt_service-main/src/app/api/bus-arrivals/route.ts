import { NextRequest, NextResponse } from "next/server";

const TAGO_CITY_CODE = "36020";
const SUPPORTED_STATION_NUMBERS = new Set(["3259316", "3251064"]);

type TagoItem = Record<string, string | number | null | undefined>;

function asItems(value: TagoItem | TagoItem[] | undefined): TagoItem[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

async function requestTago(path: string, params: Record<string, string>) {
  const configuredKey = process.env.DATA_GO_KR_SERVICE_KEY?.trim();
  if (!configuredKey) throw new Error("TAGO_API_KEY_MISSING");

  let serviceKey = configuredKey;
  try {
    serviceKey = decodeURIComponent(configuredKey);
  } catch {
    // 이미 디코딩된 키는 그대로 사용한다.
  }

  const search = new URLSearchParams({
    serviceKey,
    _type: "json",
    pageNo: "1",
    numOfRows: "20",
    ...params,
  });
  const response = await fetch(`https://apis.data.go.kr/1613000/${path}?${search}`, {
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`TAGO_HTTP_${response.status}`);

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error("TAGO_INVALID_RESPONSE");
  }

  const apiResponse = data.response as Record<string, unknown> | undefined;
  if (!apiResponse) throw new Error("TAGO_INVALID_RESPONSE");
  const header = apiResponse?.header as Record<string, unknown> | undefined;
  if (String(header?.resultCode ?? "") !== "00") {
    throw new Error(`TAGO_${String(header?.resultMsg ?? "API_ERROR")}`);
  }
  return apiResponse;
}

export async function GET(request: NextRequest) {
  const stationNo = request.nextUrl.searchParams.get("stationNo")?.trim() ?? "";
  if (!SUPPORTED_STATION_NUMBERS.has(stationNo)) {
    return NextResponse.json({ error: "Unsupported station number" }, { status: 400 });
  }

  try {
    const stationResponse = await requestTago(
      "BusSttnInfoInqireService/getSttnNoList",
      { cityCode: TAGO_CITY_CODE, nodeNo: stationNo },
    );
    const stationBody = stationResponse.body as Record<string, unknown> | undefined;
    const stationItems = (stationBody?.items as Record<string, unknown> | undefined)?.item as
      | TagoItem
      | TagoItem[]
      | undefined;
    const station = asItems(stationItems)[0];
    const nodeId = String(station?.nodeid ?? "");
    if (!nodeId) {
      return NextResponse.json({ stationNo, arrivals: [], message: "정류소 정보를 찾지 못했습니다." });
    }

    const arrivalResponse = await requestTago(
      "ArvlInfoInqireService/getSttnAcctoArvlPrearngeInfoList",
      { cityCode: TAGO_CITY_CODE, nodeId },
    );
    const arrivalBody = arrivalResponse.body as Record<string, unknown> | undefined;
    const arrivalItems = (arrivalBody?.items as Record<string, unknown> | undefined)?.item as
      | TagoItem
      | TagoItem[]
      | undefined;
    const arrivals = asItems(arrivalItems).map((item) => ({
      routeNo: String(item.routeno ?? ""),
      routeType: String(item.routetp ?? ""),
      arrivalSeconds: Number(item.arrtime ?? 0),
      remainingStops: Number(item.arrprevstationcnt ?? 0),
      vehicleType: String(item.vehicletp ?? ""),
    }));

    return NextResponse.json({
      stationNo,
      stationName: String(station.nodenm ?? ""),
      nodeId,
      arrivals,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "TAGO_API_ERROR";
    const status = message === "TAGO_API_KEY_MISSING" ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
