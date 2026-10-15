/* eslint-disable @typescript-eslint/no-explicit-any */
import { KAKAO_MAP_KEY } from "@/config/kakao";

let loading: Promise<any> | null = null;
export function loadKakaoMaps(): Promise<any> {
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    if (!KAKAO_MAP_KEY) {
      reject(new Error("NEXT_PUBLIC_KAKAO_MAP_KEY를 설정해 주세요."));
      return;
    }
    const timer = setTimeout(
      () =>
        reject(
          new Error(
            "카카오맵 SDK 응답이 없습니다. 키와 등록 도메인을 확인해 주세요.",
          ),
        ),
      20000,
    );
    const ready = () => {
      const sdk = (window as any).kakao?.maps;
      if (!sdk) {
        clearTimeout(timer);
        reject(
          new Error(
            "카카오맵 SDK를 불러오지 못했습니다. 키와 등록 도메인을 확인해 주세요.",
          ),
        );
        return;
      }
      sdk.load(() => {
        clearTimeout(timer);
        resolve(sdk);
      });
    };
    if ((window as any).kakao?.maps) {
      ready();
      return;
    }
    const script = document.createElement("script");
    script.id = "drt-kakao-maps-sdk";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(KAKAO_MAP_KEY)}&autoload=false`;
    script.async = true;
    script.onload = ready;
    script.onerror = () => {
      clearTimeout(timer);
      script.remove();
      reject(
        new Error(
          "카카오맵 SDK를 불러오지 못했습니다. 키와 등록 도메인을 확인해 주세요.",
        ),
      );
    };
    document.head.appendChild(script);
  }).catch((error) => {
    loading = null;
    throw error;
  });
  return loading;
}
