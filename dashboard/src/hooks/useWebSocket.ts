"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MetricEvent } from "@/lib/types";

const MAX_EVENTS = 200;
const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 30000;

interface UseWebSocketReturn {
  events: MetricEvent[];
  isConnected: boolean;
  connectionStatus: "connected" | "connecting" | "disconnected";
}

export function useWebSocket(url: string): UseWebSocketReturn {
  const [events, setEvents] = useState<MetricEvent[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "connecting" | "disconnected"
  >("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionStatus("connecting");

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus("connected");
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const metric: MetricEvent = JSON.parse(event.data);
        setEvents((prev) => {
          const next = [metric, ...prev];
          if (next.length > MAX_EVENTS) {
            return next.slice(0, MAX_EVENTS);
          }
          return next;
        });
      } catch {
        // Ignore malformed messages.
      }
    };

    ws.onclose = () => {
      setConnectionStatus("disconnected");
      wsRef.current = null;
      scheduleReconnect();
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [url]);

  const scheduleReconnect = useCallback(() => {
    const delay = Math.min(
      RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts.current),
      RECONNECT_MAX_DELAY
    );
    reconnectAttempts.current++;

    reconnectTimer.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    events,
    isConnected: connectionStatus === "connected",
    connectionStatus,
  };
}
