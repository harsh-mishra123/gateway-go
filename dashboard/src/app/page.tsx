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
          <span className="header-subtitle">Traffic Dashboard</span>
        </div>
        <ConnectionStatus status={connectionStatus} />
      </header>

      <main className="main-content">
        <div className="stats-bar">
          <div className="stat-card">
            <div className="stat-label">Total Requests</div>
            <div className="stat-value info">{stats.total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg Latency</div>
            <div className="stat-value success">{stats.avgLatency}ms</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Error Rate</div>
            <div className="stat-value error">{stats.errorRate}%</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Rate Limited</div>
            <div className="stat-value warning">{stats.rateLimited}</div>
          </div>
        </div>

        <div className="tab-bar">
          <button
            className={`tab-button ${activeTab === "feed" ? "active" : ""}`}
            onClick={() => setActiveTab("feed")}
          >
            Live Feed
          </button>
          <button
            className={`tab-button ${activeTab === "heatmap" ? "active" : ""}`}
            onClick={() => setActiveTab("heatmap")}
          >
            Heatmap
          </button>
          <button
            className={`tab-button ${activeTab === "rules" ? "active" : ""}`}
            onClick={() => setActiveTab("rules")}
          >
            Rules
          </button>
        </div>

        {activeTab === "feed" && <LiveFeed events={events} />}
        {activeTab === "heatmap" && <LatencyHeatmap events={events} />}
        {activeTab === "rules" && <RuleEditor />}
      </main>
    </div>
  );
}
