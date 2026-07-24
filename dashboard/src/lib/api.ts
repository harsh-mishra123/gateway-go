import { RateLimitRule, ChaosRule } from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_GATEWAY_API_URL || "http://localhost:8080/api";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// Rate limit rules

export async function getRateLimitRules(): Promise<RateLimitRule[]> {
  return request<RateLimitRule[]>("/rules/ratelimit");
}

export async function addRateLimitRule(rule: {
  route: string;
  maxRequests: number;
  windowSeconds: number;
}): Promise<RateLimitRule> {
  return request<RateLimitRule>("/rules/ratelimit", {
    method: "POST",
    body: JSON.stringify(rule),
  });
}

export async function removeRateLimitRule(id: string): Promise<void> {
  await request(`/rules/ratelimit/${id}`, { method: "DELETE" });
}

// Chaos rules

export async function getChaosRules(): Promise<ChaosRule[]> {
  return request<ChaosRule[]>("/rules/chaos");
}

export async function addChaosRule(rule: {
  route: string;
  type: "latency" | "error_rate";
  value: string;
}): Promise<ChaosRule> {
  return request<ChaosRule>("/rules/chaos", {
    method: "POST",
    body: JSON.stringify(rule),
  });
}

export async function removeChaosRule(id: string): Promise<void> {
  await request(`/rules/chaos/${id}`, { method: "DELETE" });
}
