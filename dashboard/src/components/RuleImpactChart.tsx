"use client";

import { useEffect, useState, useMemo } from "react";
import { MetricEvent } from "@/lib/types";

interface RuleImpactChartProps {
  events: MetricEvent[];
}

interface ImpactBin {
  allowed: number;
  throttled: number;
  chaos: number;
}

export function RuleImpactChart({ events }: RuleImpactChartProps) {
  const [data, setData] = useState<ImpactBin[]>(
    Array(30)
      .fill(null)
      .map(() => ({ allowed: 0, throttled: 0, chaos: 0 }))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const newBins = Array(30)
        .fill(null)
        .map(() => ({ allowed: 0, throttled: 0, chaos: 0 }));

      // Distribute events into 1-second bins for the last 30 seconds
      for (const event of events) {
        const eventTime = new Date(event.timestamp).getTime();
        const diffSeconds = Math.floor((now - eventTime) / 1000);
        if (diffSeconds >= 0 && diffSeconds < 30) {
          const idx = 29 - diffSeconds;
          if (event.rateLimited) {
            newBins[idx].throttled++;
          } else if (event.chaosError || (event.chaosLatencyMs && event.chaosLatencyMs > 0)) {
            newBins[idx].chaos++;
          } else {
            newBins[idx].allowed++;
          }
        }
      }

      setData(newBins);
    }, 1000);

    return () => clearInterval(interval);
  }, [events]);

  const maxVal = useMemo(() => {
    const max = data.reduce((acc, bin) => {
      const total = bin.allowed + bin.throttled + bin.chaos;
      return Math.max(acc, total);
    }, 5); // Default to min height of 5
    return Math.ceil(max / 5) * 5; // Round up to nearest 5
  }, [data]);

  // Generate SVG coordinates
  const width = 500;
  const height = 120;
  const padding = 15;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const barWidth = (chartWidth / 30) * 0.7;
  const barGap = (chartWidth / 30) * 0.3;

  const currentStats = useMemo(() => {
    const lastBin = data[29];
    return {
      allowed: lastBin.allowed,
      throttled: lastBin.throttled,
      chaos: lastBin.chaos,
      total: lastBin.allowed + lastBin.throttled + lastBin.chaos,
    };
  }, [data]);

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
            Rule Enforcement
          </span>
          <h4 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
            Active Policy Impact
          </h4>
        </div>
        <div style={{ display: "flex", gap: "16px", fontSize: "13px" }}>
          <div>
            <span style={{ display: "inline-block", width: "8px", height: "8px", background: "var(--text-primary)", borderRadius: "2px", marginRight: "6px" }} />
            <span style={{ color: "var(--text-secondary)" }}>Allowed</span>{" "}
            <strong style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>{currentStats.allowed}</strong>
          </div>
          <div>
            <span style={{ display: "inline-block", width: "8px", height: "8px", background: "var(--status-warning)", borderRadius: "2px", marginRight: "6px" }} />
            <span style={{ color: "var(--text-secondary)" }}>Throttled</span>{" "}
            <strong style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>{currentStats.throttled}</strong>
          </div>
          <div>
            <span style={{ display: "inline-block", width: "8px", height: "8px", background: "#7c3aed", borderRadius: "2px", marginRight: "6px" }} />
            <span style={{ color: "var(--text-secondary)" }}>Chaos</span>{" "}
            <strong style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>{currentStats.chaos}</strong>
          </div>
        </div>
      </div>

      <div style={{ position: "relative", width: "100%", height: `${height}px` }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
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

          {/* Stacked Bars */}
          {data.map((bin, idx) => {
            const x = padding + idx * (barWidth + barGap);

            // Compute heights based on proportions
            const allowedH = (bin.allowed / maxVal) * chartHeight;
            const throttledH = (bin.throttled / maxVal) * chartHeight;
            const chaosH = (bin.chaos / maxVal) * chartHeight;

            // Stack positions (Y starts from bottom going up)
            const allowedY = padding + chartHeight - allowedH;
            const throttledY = allowedY - throttledH;
            const chaosY = throttledY - chaosH;

            return (
              <g key={idx}>
                {bin.allowed > 0 && (
                  <rect
                    x={x}
                    y={allowedY}
                    width={barWidth}
                    height={allowedH}
                    fill="var(--text-primary)"
                    rx="1.5"
                  />
                )}
                {bin.throttled > 0 && (
                  <rect
                    x={x}
                    y={throttledY}
                    width={barWidth}
                    height={throttledH}
                    fill="var(--status-warning)"
                    rx="1.5"
                  />
                )}
                {bin.chaos > 0 && (
                  <rect
                    x={x}
                    y={chaosY}
                    width={barWidth}
                    height={chaosH}
                    fill="#7c3aed"
                    rx="1.5"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Max label */}
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
          {maxVal} req
        </span>
      </div>
    </div>
  );
}
