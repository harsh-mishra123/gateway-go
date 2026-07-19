"use client";

import { useMemo, useState } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { LiveFeed } from "@/components/LiveFeed";
import { LatencyHeatmap } from "@/components/LatencyHeatmap";
import { RuleEditor } from "@/components/RuleEditor";

const WS_URL = "ws://localhost:8080/ws/metrics";

type Tab = "feed" | "heatmap" | "rules";

export default function DashboardPage() {
  const { events, connectionStatus } = useWebSocket(WS_URL);
  const [activeTab, setActiveTab] = useState<Tab>("feed");

  const stats = useMemo(() => {
    if (events.length === 0) {
      return { total: 0, avgLatency: 0, errorRate: 0, rateLimited: 0 };
    }
    const total = events.length;
    const avgLatency =
      events.reduce((sum, e) => sum + e.latencyMs, 0) / total;
    const errors = events.filter((e) => e.statusCode >= 500).length;
    const rateLimited = events.filter((e) => e.rateLimited).length;
    return {
      total,
      avgLatency: Math.round(avgLatency),
      errorRate: Math.round((errors / total) * 100),
      rateLimited,
    };
  }, [events]);

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-left">
          <span className="header-logo">gateway-go</span>
        </div>
        <nav className="header-nav">
          <button
            className={`header-nav-link ${activeTab === "feed" ? "active" : ""}`}
            onClick={() => setActiveTab("feed")}
          >
            Live Traffic
          </button>
          <button
            className={`header-nav-link ${activeTab === "heatmap" ? "active" : ""}`}
            onClick={() => setActiveTab("heatmap")}
          >
            Latency Heatmap
          </button>
          <button
            className={`header-nav-link ${activeTab === "rules" ? "active" : ""}`}
            onClick={() => setActiveTab("rules")}
          >
            Traffic Rules
          </button>
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <ConnectionStatus status={connectionStatus} />
          <a
            href="http://localhost:8080/api/health"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{
              padding: "6px 14px",
              fontSize: "13px",
              textDecoration: "none",
              borderRadius: "100px",
            }}
          >
            API Health
          </a>
        </div>
      </header>

      <main className="main-content">
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div
            className="indicator"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-secondary)",
              padding: "4px 12px",
              borderRadius: "100px",
              fontSize: "12px",
              textTransform: "none",
              fontWeight: 500,
              marginBottom: "16px",
              marginLeft: 0,
            }}
          >
            <span style={{ color: "var(--status-success)", marginRight: "6px" }}>●</span>
            Active Traffic Gateway
          </div>
          <h1
            className="section-heading"
            style={{
              fontSize: "44px",
              letterSpacing: "-1.5px",
              fontWeight: 800,
              maxWidth: "600px",
              margin: "0 auto 16px auto",
            }}
          >
            Control and observe traffic in real-time.
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "16px",
              maxWidth: "500px",
              margin: "0 auto 32px auto",
            }}
          >
            A lightweight, programmatically controlled reverse proxy to manage rate limits,
            inject chaos, and analyze latency.
          </p>

          {/* Code display block mimicking reference image */}
          <div
            style={{
              background: "var(--bg-code)",
              borderRadius: "12px",
              padding: "20px 24px",
              textAlign: "left",
              maxWidth: "540px",
              margin: "0 auto 48px auto",
              boxShadow: "var(--shadow-md)",
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              color: "#a1a1aa",
              lineHeight: "1.7",
            }}
          >
            <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444" }}></span>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#eab308" }}></span>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e" }}></span>
            </div>
            <div style={{ color: "#71717a", marginBottom: "4px" }}># active gateway routing rule</div>
            <div>
              <span style={{ color: "var(--status-info)" }}>forward</span> /* &rarr; http://localhost:4000
            </div>
            <div style={{ color: "#71717a", margin: "12px 0 4px 0" }}># request flow lifecycle</div>
            <div>
              logging &rarr; <span style={{ color: "var(--status-warning)" }}>rate-limit</span> &rarr;{" "}
              <span style={{ color: "#a855f7" }}>chaos-injection</span> &rarr; reverse-proxy
            </div>
          </div>
        </div>

        <div className="stats-bar">
          <div className="stat-card">
            <div className="stat-label">Total Requests</div>
            <div className="stat-value info">{stats.total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg Latency</div>
            <div className="stat-value success">
              {stats.avgLatency}
              <span className="stat-unit">ms</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Error Rate</div>
            <div className="stat-value error">
              {stats.errorRate}
              <span className="stat-unit">%</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Rate Limited</div>
            <div className="stat-value warning">{stats.rateLimited}</div>
          </div>
        </div>

        <div style={{ marginTop: "48px" }}>
          {activeTab === "feed" && <LiveFeed events={events} />}
          {activeTab === "heatmap" && <LatencyHeatmap events={events} />}
          {activeTab === "rules" && <RuleEditor />}
        </div>
      </main>
    </div>
  );
}
