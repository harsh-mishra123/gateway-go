"use client";

import { useEffect, useState } from "react";

export function ProxyFlowVisual() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 5);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const steps = [
    { label: "Client Request", desc: "Incoming API request hits port :8080" },
    { label: "Rate Limiter", desc: "Token bucket check per client IP" },
    { label: "Chaos Latency", desc: "Simulates network latency spikes" },
    { label: "Chaos Error", desc: "Probabilistic fault injection (500)" },
    { label: "Target Backend", desc: "Forwarded to backend on port :4000" },
  ];

  return (
    <div
      style={{
        background: "var(--bg-section)",
        border: "1px solid var(--border-hairline)",
        borderRadius: "16px",
        padding: "32px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        width: "100%",
        maxWidth: "600px",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
          padding: "0 10px",
        }}
      >
        {/* Connector Line */}
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "40px",
            right: "40px",
            height: "2px",
            background: "var(--border-hairline)",
            zIndex: 1,
          }}
        />

        {/* Animated Active Line */}
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "40px",
            width: `${activeStep * 25}%`,
            height: "2px",
            background: "var(--text-primary)",
            transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
            zIndex: 1,
          }}
        />

        {steps.map((step, idx) => {
          const isActive = idx <= activeStep;
          const isCurrent = idx === activeStep;

          return (
            <div
              key={idx}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                zIndex: 2,
                cursor: "pointer",
              }}
              onClick={() => setActiveStep(idx)}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: isCurrent
                    ? "var(--text-primary)"
                    : isActive
                      ? "var(--bg-page)"
                      : "var(--bg-elevated)",
                  border: `2px solid ${isActive ? "var(--text-primary)" : "var(--border-hairline)"}`,
                  color: isCurrent
                    ? "var(--bg-page)"
                    : isActive
                      ? "var(--text-primary)"
                      : "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 600,
                  fontSize: "14px",
                  transition: "all 0.3s ease",
                }}
              >
                {idx + 1}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          textAlign: "center",
          minHeight: "80px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <h4
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: "4px",
            transition: "all 0.3s ease",
          }}
        >
          {steps[activeStep].label}
        </h4>
        <p
          style={{
            fontSize: "13px",
            color: "var(--text-secondary)",
            transition: "all 0.3s ease",
          }}
        >
          {steps[activeStep].desc}
        </p>
      </div>

      {/* Mock pipeline block */}
      <div
        style={{
          borderTop: "1px solid var(--border-hairline)",
          paddingTop: "20px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "12px",
          fontSize: "12px",
          fontFamily: "var(--font-mono)",
          color: "var(--text-secondary)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>RATE LIMIT</div>
          <div style={{ fontWeight: 600, color: "var(--status-success)" }}>10 req/sec</div>
        </div>
        <div style={{ textAlign: "center", borderLeft: "1px solid var(--border-hairline)", borderRight: "1px solid var(--border-hairline)" }}>
          <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>LATENCY</div>
          <div style={{ fontWeight: 600, color: "var(--status-warning)" }}>+250ms</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>ERROR RATE</div>
          <div style={{ fontWeight: 600, color: "var(--status-error)" }}>15% injection</div>
        </div>
      </div>
    </div>
  );
}
