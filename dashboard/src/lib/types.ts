export interface MetricEvent {
  timestamp: string;
  route: string;
  method: string;
  clientIP: string;
  statusCode: number;
  latencyMs: number;
  rateLimited: boolean;
  chaosLatencyMs?: number;
  chaosError?: boolean;
}

export interface RateLimitRule {
  id: string;
  route: string;
  maxRequests: number;
  windowSeconds: number;
  clientIP?: string;
}

export interface ChaosRule {
  id: string;
  route: string;
  type: "latency" | "error_rate";
  value: string;
  enabled: boolean;
}
