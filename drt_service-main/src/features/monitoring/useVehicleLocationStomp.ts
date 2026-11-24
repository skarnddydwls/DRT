"use client";

import { useEffect, useRef, useState } from "react";
import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";
import type { VehicleMarker } from "@/types/monitoring";

export type StompConnectionStatus =
    | "idle" // 비활성 상태
    | "connecting" // 연결 시도 중
    | "connected" // 연결됨
    | "disconnected" // 연결 끊김
    | "error";

export interface UseVehicleLocationStompOptions {
    brokerURL?: string;          // 예: process.env.NEXT_PUBLIC_WS_URL
    topic?: string;              // 예: "/topic/vehicle/location"
    enabled?: boolean;           // 기본값 true
    onVehicles: (vehicles: VehicleMarker[]) => void;
    onConnected?: () => void;    // 연결/재연결 직후 REST 스냅샷 재동기화 훅
}

export function useVehicleLocationStomp({
    brokerURL,
    topic,
    enabled = true,
    onVehicles,
    onConnected,
}: UseVehicleLocationStompOptions) {
    const [status, setStatus] = useState<StompConnectionStatus>("idle");

    // 1) 콜백을 ref에 담아 useEffect 재실행(불필요한 소켓 재연결) 방지
    const onVehiclesRef = useRef(onVehicles);
    const onConnectedRef = useRef(onConnected);

    useEffect(() => {
        onVehiclesRef.current = onVehicles;
        onConnectedRef.current = onConnected;
    }, [onVehicles, onConnected]);

    // 2) STOMP 연결 및 구독 수명주기 관리
    useEffect(() => {
        if (!enabled || !brokerURL || !topic) return;

        let active = true;
        let subscription: StompSubscription | null = null;

        const client = new Client({
            brokerURL,
            reconnectDelay: 3000,
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000,
            debug:
                process.env.NODE_ENV === "production"
                    ? () => { }
                    : (msg) => console.debug("[STOMP]", msg),

            beforeConnect: () => {
                if (active) setStatus("connecting");
            },

            onConnect: () => {
                if (!active) return;
                setStatus("connected");

                subscription = client.subscribe(topic, (message: IMessage) => {
                    if (!active) return;
                    try {
                        const parsed: unknown = JSON.parse(message.body);
                        // TODO: 백엔드 스펙 확정 후 Zod 스키마 검증/정규화로 교체
                        const vehicles = (
                            Array.isArray(parsed) ? parsed : [parsed]
                        ) as VehicleMarker[];
                        onVehiclesRef.current(vehicles);
                    } catch (error) {
                        console.error("[STOMP] Failed to parse vehicle message:", error);
                    }
                });

                onConnectedRef.current?.();
            },

            onWebSocketClose: () => {
                if (active) setStatus("disconnected");
            },

            onStompError: (frame) => {
                console.error("[STOMP] Broker error:", frame.headers["message"]);
                if (active) setStatus("error");
            },
        });

        client.activate();

        // 3) 언마운트 / React 19 StrictMode 이중 마운트 대비 정리
        return () => {
            active = false;
            subscription?.unsubscribe();
            subscription = null;
            void client.deactivate();
        };
    }, [brokerURL, topic, enabled]);

    // 비활성 상태일 때는 effect 안에서 setState 안 때리고 바로 "idle" 반환
    const connectionStatus: StompConnectionStatus =
        !enabled || !brokerURL || !topic ? "idle" : status;

    return { status: connectionStatus };
}