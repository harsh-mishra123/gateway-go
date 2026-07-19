"use client";

import { useEffect, useState, useMemo } from "react";
import { MetricEvent } from "@/lib/types";

interface TrafficVolumeChartProps {
  events: MetricEvent[];
}

export function TrafficVolumeChart({ events }: TrafficVolumeChartProps) {
  const [data, setData] = useState<number[]>(Array(30).fill(0));

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const newBinCounts = Array(30).fill(0);

      // Distribute events into 1-second bins for the last 30 seconds
      for (const event of events) {
        const eventTime = new Date(event.timestamp).getTime();
        const diffSeconds = Math.floor((now - eventTime) / 1000);
        if (diffSeconds >= 0 && diffSeconds < 30) {
          newBinCounts[29 - diffSeconds]++;
        }
      }

      setData(newBinCounts);
    }, 1000);

    return () => clearInterval(interval);
  }, [events]);

  const maxVal = useMemo(() => {
    const max = Math.max(...data, 1);
    return Math.ceil(max / 5) * 5; // Round up to nearest 5 for clean grid lines
  }, [data]);

  // Generate SVG path coordinates
  const width = 500;
  const height = 120;
  const padding = 15;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = useMemo(() => {
    return data.map((val, idx) => {
      const x = padding + (idx / 29) * chartWidth;
      const y = padding + chartHeight - (val / maxVal) * chartHeight;
      return { x, y };
    });
  }, [data, maxVal, chartWidth, chartHeight]);

  const pathD = useMemo(() => {
    if (points.length === 0) return "";
    return points.reduce((acc, p, idx) => {
      return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, "");
  }, [points]);

  const areaD = useMemo(() => {
    if (points.length === 0) return "";
    const first = points[0];
    const last = points[points.length - 1];
    return `${pathD} L ${last.x} ${height - padding} L ${first.x} ${height - padding} Z`;
  }, [points, pathD, height]);

  return (
    <div
      style={{
        border: "1px solid var(--border-hairline)",
        borderRadius: "12px",
        padding: "20px",
        background: "var(--bg-card)",
        marginBottom: "24px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", alignItems: "center" }}>
        <div>
          <span className="section-label" style={{ fontSize: "11px", marginBottom: "4px", display: "block" }}>
            Traffic Rate
          </span>
          <h4 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
            Requests per Second (RPS)
          </h4>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ fontSize: "20px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
            {data[29]}
          </span>
          <span style={{ fontSize: "12px", color: "var(--text-muted)", marginLeft: "4px" }}>RPS current</span>
        </div>
      </div>

      <div style={{ position: "relative", width: "100%", height: `${height}px` }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--text-primary)" stopOpacity="0.08" />
              <stop offset="100%" stopColor="var(--text-primary)" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={padding}
            y1={padding}
            x2={width - padding}
            y2={padding}
            stroke="var(--border-hairline)"
            strokeDasharray="4 4"
          />
          <line
            x1={padding}
            y1={padding + chartHeight / 2}
            x2={width - padding}
            y2={padding + chartHeight / 2}
            stroke="var(--border-hairline)"
            strokeDasharray="4 4"
          />
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="var(--border-hairline)"
          />

          {/* Area under the line */}
          <path d={areaD} fill="url(#chartAreaGradient)" />

          {/* Main line path */}
          <path d={pathD} fill="none" stroke="var(--text-primary)" strokeWidth="1.75" strokeLinecap="round" />

          {/* Glowing dot for current point */}
          {points.length > 0 && (
            <circle
              cx={points[points.length - 1].x}
              cy={points[points.length - 1].y}
              r="4"
              fill="var(--text-primary)"
            />
          )}
        </svg>

        {/* Max Y axis label */}
        <span
          style={{
            position: "absolute",
            top: "8px",
            left: `${padding}px`,
            fontSize: "9px",
            fontFamily: "var(--font-mono)",
            color: "var(--text-muted)",
          }}
        >
          {maxVal} rps
        </span>

        {/* Min Y axis label */}
        <span
          style={{
            position: "absolute",
            bottom: "8px",
            left: `${padding}px`,
            fontSize: "9px",
            fontFamily: "var(--font-mono)",
            color: "var(--text-muted)",
          }}
        >
          0 rps
        </span>
      </div>
    </div>
  );
}
