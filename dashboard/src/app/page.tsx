"use client";

import { useMemo, useState } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { LiveFeed } from "@/components/LiveFeed";
import { LatencyHeatmap } from "@/components/LatencyHeatmap";
import { RuleEditor } from "@/components/RuleEditor";
import { ProxyFlowVisual } from "@/components/ProxyFlowVisual";

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
        {/* HERO SECTION */}
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

        {/* METRICS & WORKSPACE PANEL */}
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

        <div style={{ marginTop: "48px", marginBottom: "96px" }}>
          {activeTab === "feed" && <LiveFeed events={events} />}
          {activeTab === "heatmap" && <LatencyHeatmap events={events} />}
          {activeTab === "rules" && <RuleEditor events={events} />}
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--border-hairline)", margin: "96px 0" }} />

        {/* SECTION 2: THE PROBLEM */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "64px",
            alignItems: "center",
            marginBottom: "96px",
          }}
        >
          <div>
            <div className="section-label">The Problem</div>
            <h2 className="section-heading" style={{ fontSize: "36px", marginBottom: "20px" }}>
              Microservice failures go undetected — until production crashes.
            </h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "24px", fontSize: "15px" }}>
              In local development environments, APIs are always fast and reliable. In production, however, network latency spikes, rate limiters drop requests, and backends fail. Replicating these scenarios locally is typically painful and requires heavy setup.
            </p>
            <div style={{ display: "grid", gap: "12px" }}>
              <div className="problem-card">
                <div className="problem-icon">
                  <svg viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                </div>
                <div>
                  <h4 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>
                    Silent Cascading Failures
                  </h4>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                    A minor latency spike in one service can consume resource pools and bring down the entire downstream application stack.
                  </p>
                </div>
              </div>
              <div className="problem-card">
                <div className="problem-icon">
                  <svg viewBox="0 0 24 24"><path d="M18.364 5.636a9 9 0 0 1 0 12.728M5.636 18.364a9 9 0 0 1 0-12.728M15.536 8.464a5 5 0 0 1 0 7.072M8.464 15.536a5 5 0 0 1 0-7.072" /><circle cx="12" cy="12" r="1" fill="currentColor" /></svg>
                </div>
                <div>
                  <h4 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>
                    Complex Integration Tests
                  </h4>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                    Simulating flaky services or throttling typically requires complex third-party tools or changes to codebase logic.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div>
            <ProxyFlowVisual />
          </div>
        </section>

        <hr style={{ border: "none", borderTop: "1px solid var(--border-hairline)", margin: "96px 0" }} />

        {/* SECTION 3: HOW IT WORKS */}
        <section style={{ marginBottom: "96px" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <div className="section-label">How it works</div>
            <h2 className="section-heading" style={{ fontSize: "36px" }}>
              Three steps to test system resilience.
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px" }}>
            <div className="landing-card">
              <div className="step-header">
                <div className="icon-circle">
                  <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
                </div>
                <span className="step-num">01</span>
              </div>
              <h4 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>
                Route Traffic
              </h4>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                Start gateway-go and point it to your backend. Point your clients (browsers, apps) to the gateway&apos;s port.
              </p>
            </div>
            <div className="landing-card">
              <div className="step-header">
                <div className="icon-circle">
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M12 1v4m0 14v4M4.22 4.22l2.83 2.83m9.9 9.9 2.83 2.83M1 12h4m14 0h4M4.22 19.78l2.83-2.83m9.9-9.9 2.83-2.83" /></svg>
                </div>
                <span className="step-num">02</span>
              </div>
              <h4 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>
                Apply Rules Live
              </h4>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                Inject rate limit policies or chaos conditions like artificial latency and random failures via the dashboard rule editor.
              </p>
            </div>
            <div className="landing-card">
              <div className="step-header">
                <div className="icon-circle">
                  <svg viewBox="0 0 24 24"><path d="M3 3v18h18" /><path d="m7 17 4-8 4 4 4-8" /></svg>
                </div>
                <span className="step-num">03</span>
              </div>
              <h4 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>
                Analyze Behaviors
              </h4>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                Watch requests flow in real-time, monitor latency heatmaps, and verify that your application correctly handles degraded states.
              </p>
            </div>
          </div>
        </section>

        <hr style={{ border: "none", borderTop: "1px solid var(--border-hairline)", margin: "96px 0" }} />

        {/* SECTION 4: FEATURES */}
        <section style={{ marginBottom: "96px" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <div className="section-label">Features</div>
            <h2 className="section-heading" style={{ fontSize: "36px" }}>
              Core capabilities for traffic observation.
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div className="landing-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              </div>
              <h4 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>
                Thread-Safe Rule Store
              </h4>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                An in-memory rule manager built on Go&apos;s concurrent design patterns with sync.RWMutex, supporting zero-downtime hot reloads.
              </p>
            </div>
            <div className="landing-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5Z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" /></svg>
              </div>
              <h4 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>
                Token Bucket Rate Limiter
              </h4>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                Enforce rate limiting using a custom-built low-overhead token bucket algorithm featuring lazy refills and automatic stale client cleanup.
              </p>
            </div>
            <div className="landing-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" /></svg>
              </div>
              <h4 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>
                Active Chaos Engineering
              </h4>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                Dynamically inject latencies or probabilistic HTTP failures to test system resilience and recovery under realistic fault conditions.
              </p>
            </div>
            <div className="landing-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
              </div>
              <h4 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>
                WebSocket Metrics Pipeline
              </h4>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                Every request event is instantly broadcasted to connected dashboards over WebSockets, separated entirely from the hot proxy pipeline.
              </p>
            </div>
          </div>
        </section>

        <footer className="footer">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="footer-brand-logo">gateway-go</div>
              <p className="footer-brand-desc">
                Observe and control API traffic with a high-performance HTTP reverse proxy, live metrics engine, and fault injection hub.
              </p>
            </div>
            <div className="footer-col">
              <span className="footer-col-title">Observability</span>
              <ul className="footer-col-links">
                <li><a className="footer-link" onClick={() => setActiveTab("feed")}>Live Traffic</a></li>
                <li><a className="footer-link" onClick={() => setActiveTab("heatmap")}>Latency Heatmap</a></li>
                <li><a className="footer-link" onClick={() => setActiveTab("rules")}>Traffic Rules</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <span className="footer-col-title">Features</span>
              <ul className="footer-col-links">
                <li><span className="footer-link">Rule Store</span></li>
                <li><span className="footer-link">Token Bucket</span></li>
                <li><span className="footer-link">Chaos Engine</span></li>
                <li><span className="footer-link">WebSocket Metrics</span></li>
              </ul>
            </div>
            <div className="footer-col">
              <span className="footer-col-title">Resources</span>
              <ul className="footer-col-links">
                <li><a className="footer-link" href="http://localhost:8080/api/health" target="_blank" rel="noopener noreferrer">API Health</a></li>
                <li><a className="footer-link" href="https://github.com" target="_blank" rel="noopener noreferrer">Documentation</a></li>
                <li><a className="footer-link" href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>&copy; 2026 gateway-go. All rights reserved.</span>
            <span className="footer-bottom-joke">
              High-performance proxying &mdash; not a latency guarantee.
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}
