"use client";

import { useState, useEffect, useCallback } from "react";
import { RateLimitRule, ChaosRule, MetricEvent } from "@/lib/types";
import {
  getRateLimitRules,
  addRateLimitRule,
  removeRateLimitRule,
  getChaosRules,
  addChaosRule,
  removeChaosRule,
} from "@/lib/api";
import { RuleImpactChart } from "./RuleImpactChart";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

interface RuleEditorProps {
  events: MetricEvent[];
}

export function RuleEditor({ events }: RuleEditorProps) {
  // Rate limit state
  const [rateLimitRules, setRateLimitRules] = useState<RateLimitRule[]>([]);
  const [rlRoute, setRlRoute] = useState("/");
  const [rlMaxReqs, setRlMaxReqs] = useState("10");
  const [rlWindow, setRlWindow] = useState("10");

  // Chaos state
  const [chaosRules, setChaosRules] = useState<ChaosRule[]>([]);
  const [chaosRoute, setChaosRoute] = useState("/");
  const [chaosType, setChaosType] = useState<"latency" | "error_rate">(
    "latency"
  );
  const [chaosValue, setChaosValue] = useState("500ms");

  // UI state
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loading, setLoading] = useState(false);

  const showToast = useCallback(
    (message: string, type: "success" | "error") => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    },
    []
  );

  const fetchRules = useCallback(async () => {
    try {
      const [rl, chaos] = await Promise.all([
        getRateLimitRules(),
        getChaosRules(),
      ]);
      setRateLimitRules(rl || []);
      setChaosRules(chaos || []);
    } catch {
      // Gateway might not be running yet.
    }
  }, []);

  useEffect(() => {
    fetchRules();
    const interval = setInterval(fetchRules, 5000);
    return () => clearInterval(interval);
  }, [fetchRules]);

  const handleAddRateLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const rule = await addRateLimitRule({
        route: rlRoute,
        maxRequests: parseFloat(rlMaxReqs),
        windowSeconds: parseInt(rlWindow),
      });
      setRateLimitRules((prev) => [...prev, rule]);
      showToast(`Rate limit added for ${rlRoute}`, "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to add rule",
        "error"
      );
    }
    setLoading(false);
  };

  const handleRemoveRateLimit = async (id: string) => {
    try {
      await removeRateLimitRule(id);
      setRateLimitRules((prev) => prev.filter((r) => r.id !== id));
      showToast("Rate limit removed", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to remove rule",
        "error"
      );
    }
  };

  const handleAddChaos = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const rule = await addChaosRule({
        route: chaosRoute,
        type: chaosType,
        value: chaosValue,
      });
      setChaosRules((prev) => [...prev, rule]);
      showToast(`Chaos rule added for ${chaosRoute}`, "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to add rule",
        "error"
      );
    }
    setLoading(false);
  };

  const handleRemoveChaos = async (id: string) => {
    try {
      await removeChaosRule(id);
      setChaosRules((prev) => prev.filter((r) => r.id !== id));
      showToast("Chaos rule removed", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to remove rule",
        "error"
      );
    }
  };

  return (
    <>
      <RuleImpactChart events={events} />
      <div className="rules-container">
        {/* Rate Limit Section */}
        <div className="rule-section">
          <div className="rule-section-title">
            <span className="rule-section-icon">&#9889;</span>
            Rate Limiting
          </div>
          <form onSubmit={handleAddRateLimit}>
            <div className="form-group">
              <label className="form-label" htmlFor="rl-route">Route</label>
              <input
                id="rl-route"
                className="form-input"
                type="text"
                value={rlRoute}
                onChange={(e) => setRlRoute(e.target.value)}
                placeholder="/api/products"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="rl-max">Max Requests</label>
                <input
                  id="rl-max"
                  className="form-input"
                  type="number"
                  value={rlMaxReqs}
                  onChange={(e) => setRlMaxReqs(e.target.value)}
                  min="1"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="rl-window">Window (seconds)</label>
                <input
                  id="rl-window"
                  className="form-input"
                  type="number"
                  value={rlWindow}
                  onChange={(e) => setRlWindow(e.target.value)}
                  min="1"
                />
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              Add Rate Limit
            </button>
          </form>

          <div className="active-rules">
            <div className="active-rules-title">Active Rules</div>
            {rateLimitRules.length === 0 ? (
              <div className="no-rules">No rate limit rules active</div>
            ) : (
              rateLimitRules.map((rule) => (
                <div key={rule.id} className="rule-chip">
                  <span className="rule-chip-info">
                    <span className="rule-chip-route">{rule.route}</span>{" "}
                    {rule.maxRequests} req / {rule.windowSeconds}s
                  </span>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleRemoveRateLimit(rule.id)}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chaos Section */}
        <div className="rule-section">
          <div className="rule-section-title">
            <span className="rule-section-icon">&#127754;</span>
            Chaos Injection
          </div>
          <form onSubmit={handleAddChaos}>
            <div className="form-group">
              <label className="form-label" htmlFor="chaos-route">Route</label>
              <input
                id="chaos-route"
                className="form-input"
                type="text"
                value={chaosRoute}
                onChange={(e) => setChaosRoute(e.target.value)}
                placeholder="/api/checkout"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="chaos-type">Type</label>
                <select
                  id="chaos-type"
                  className="form-select"
                  value={chaosType}
                  onChange={(e) =>
                    setChaosType(e.target.value as "latency" | "error_rate")
                  }
                >
                  <option value="latency">Latency Injection</option>
                  <option value="error_rate">Error Rate</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="chaos-value">
                  {chaosType === "latency" ? "Duration (e.g. 500ms)" : "Rate (0-1)"}
                </label>
                <input
                  id="chaos-value"
                  className="form-input"
                  type="text"
                  value={chaosValue}
                  onChange={(e) => setChaosValue(e.target.value)}
                  placeholder={chaosType === "latency" ? "500ms" : "0.3"}
                />
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              Add Chaos Rule
            </button>
          </form>

          <div className="active-rules">
            <div className="active-rules-title">Active Rules</div>
            {chaosRules.length === 0 ? (
              <div className="no-rules">No chaos rules active</div>
            ) : (
              chaosRules.map((rule) => (
                <div key={rule.id} className="rule-chip">
                  <span className="rule-chip-info">
                    <span className="rule-chip-route">{rule.route}</span>{" "}
                    {rule.type === "latency"
                      ? `+${rule.value} latency`
                      : `${(parseFloat(rule.value) * 100).toFixed(0)}% errors`}
                  </span>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleRemoveChaos(rule.id)}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </>
  );
}
