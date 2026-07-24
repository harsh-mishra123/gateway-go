"use client";

import { MetricEvent } from "@/lib/types";
import { TrafficVolumeChart } from "./TrafficVolumeChart";

interface LiveFeedProps {
  events: MetricEvent[];
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getMethodClass(method: string): string {
  return `method-badge ${method.toLowerCase()}`;
}

function getStatusClass(code: number): string {
  if (code >= 200 && code < 300) return "status-badge s2xx";
  if (code >= 400 && code < 500) return "status-badge s4xx";
  return "status-badge s5xx";
}

function formatLatency(ms: number): string {
  if (ms < 1) return "<1ms";
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.round(ms)}ms`;
}

export function LiveFeed({ events }: LiveFeedProps) {
  return (
    <>
      <TrafficVolumeChart events={events} />

      <div className="feed-container">
        <div className="feed-header">
          <span className="feed-title">Live Request Feed</span>
          <span className="feed-count">{events.length} events</span>
        </div>
        <div className="feed-scroll-area">
          <table className="feed-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Method</th>
                <th>Route</th>
                <th>Client IP</th>
                <th>Status</th>
                <th>Latency</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event, i) => (
                <tr key={`${event.timestamp}-${i}`} className={i < 3 ? "feed-row-enter" : ""}>
                  <td>{formatTime(event.timestamp)}</td>
                  <td>
                    <span className={getMethodClass(event.method)}>
                      {event.method}
                    </span>
                  </td>
                  <td>{event.route}</td>
                  <td>{event.clientIP}</td>
                  <td>
                    <span className={getStatusClass(event.statusCode)}>
                      {event.statusCode}
                    </span>
                  </td>
                  <td>{formatLatency(event.latencyMs)}</td>
                  <td>
                    {(event.rateLimited || event.statusCode === 429) && (
                      <span className="indicator rate-limited">throttled</span>
                    )}
                    {(event.chaosLatencyMs || event.chaosError) && (
                      <span className="indicator chaos">chaos</span>
                    )}
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                    Waiting for requests...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
