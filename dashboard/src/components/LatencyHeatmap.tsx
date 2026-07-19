"use client";

import { useMemo, useState } from "react";
import { MetricEvent } from "@/lib/types";

interface LatencyHeatmapProps {
  events: MetricEvent[];
}

const BUCKET_COUNT = 12;
const BUCKET_SIZE_SECONDS = 5;

interface CellData {
  avgLatency: number;
  count: number;
  minLatency: number;
  maxLatency: number;
}

function getHeatClass(avgLatency: number): string {
  if (avgLatency <= 0) return "heatmap-cell empty";
  if (avgLatency < 100) return "heatmap-cell cold";
  if (avgLatency < 300) return "heatmap-cell warm";
  if (avgLatency < 700) return "heatmap-cell hot";
  return "heatmap-cell critical";
}

function formatBucketTime(secondsAgo: number): string {
  if (secondsAgo === 0) return "now";
  return `-${secondsAgo}s`;
}

export function LatencyHeatmap({ events }: LatencyHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{
    route: string;
    bucket: number;
  } | null>(null);

  const { routes, grid, timeLabels } = useMemo(() => {
    const now = Date.now();
    const routeSet = new Set<string>();
    const bucketMap = new Map<string, CellData[]>();

    // Collect unique routes.
    for (const event of events) {
      routeSet.add(event.route);
    }

    const sortedRoutes = Array.from(routeSet).sort();

    // Initialize grid.
    for (const route of sortedRoutes) {
      bucketMap.set(
        route,
        Array.from({ length: BUCKET_COUNT }, () => ({
          avgLatency: 0,
          count: 0,
          minLatency: Infinity,
          maxLatency: 0,
        }))
      );
    }

    // Fill buckets.
    for (const event of events) {
      const eventTime = new Date(event.timestamp).getTime();
      const secondsAgo = (now - eventTime) / 1000;
      const bucketIndex =
        BUCKET_COUNT - 1 - Math.floor(secondsAgo / BUCKET_SIZE_SECONDS);
      if (bucketIndex < 0 || bucketIndex >= BUCKET_COUNT) continue;

      const cells = bucketMap.get(event.route);
      if (!cells) continue;

      const cell = cells[bucketIndex];
      cell.avgLatency =
        (cell.avgLatency * cell.count + event.latencyMs) / (cell.count + 1);
      cell.count++;
      cell.minLatency = Math.min(cell.minLatency, event.latencyMs);
      cell.maxLatency = Math.max(cell.maxLatency, event.latencyMs);
    }

    const labels = Array.from({ length: BUCKET_COUNT }, (_, i) => {
      const secondsAgo = (BUCKET_COUNT - 1 - i) * BUCKET_SIZE_SECONDS;
      return formatBucketTime(secondsAgo);
    });

    return {
      routes: sortedRoutes,
      grid: bucketMap,
      timeLabels: labels,
    };
  }, [events]);

  if (routes.length === 0) {
    return (
      <div className="heatmap-container">
        <div className="heatmap-title">Latency Heatmap</div>
        <div
          style={{
            textAlign: "center",
            padding: "48px",
            color: "var(--text-muted)",
          }}
        >
          Waiting for requests to build heatmap...
        </div>
      </div>
    );
  }

  return (
    <div className="heatmap-container">
      <div className="heatmap-title">Latency Heatmap</div>
      <div className="heatmap-grid">
        {routes.map((route) => {
          const cells = grid.get(route) || [];
          return (
            <div key={route} className="heatmap-row">
              <span className="heatmap-route-label" title={route}>
                {route}
              </span>
              {cells.map((cell, bucketIdx) => (
                <div
                  key={bucketIdx}
                  className={getHeatClass(cell.count > 0 ? cell.avgLatency : 0)}
                  onMouseEnter={() =>
                    setHoveredCell({ route, bucket: bucketIdx })
                  }
                  onMouseLeave={() => setHoveredCell(null)}
                  style={{ position: "relative" }}
                >
                  {hoveredCell?.route === route &&
                    hoveredCell?.bucket === bucketIdx &&
                    cell.count > 0 && (
                      <div className="heatmap-tooltip">
                        {Math.round(cell.avgLatency)}ms avg | {cell.count} req |{" "}
                        {Math.round(cell.minLatency)}-{Math.round(cell.maxLatency)}ms
                      </div>
                    )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <div className="heatmap-time-axis">
        {timeLabels.map((label, i) => (
          <span key={i} className="heatmap-time-label">
            {label}
          </span>
        ))}
      </div>
      <div className="heatmap-legend">
        <div className="heatmap-legend-item">
          <div
            className="heatmap-legend-color"
            style={{ background: "var(--heat-cold)" }}
          />
          &lt;100ms
        </div>
        <div className="heatmap-legend-item">
          <div
            className="heatmap-legend-color"
            style={{ background: "var(--heat-warm)" }}
          />
          100-300ms
        </div>
        <div className="heatmap-legend-item">
          <div
            className="heatmap-legend-color"
            style={{ background: "var(--heat-hot)" }}
          />
          300-700ms
        </div>
        <div className="heatmap-legend-item">
          <div
            className="heatmap-legend-color"
            style={{ background: "var(--heat-critical)" }}
          />
          &gt;700ms
        </div>
      </div>
    </div>
  );
}
