package metrics

import "time"

// Metric represents a single request event emitted by the gateway for
// real-time streaming to dashboard clients.
type Metric struct {
	Timestamp    time.Time `json:"timestamp"`
	Route        string    `json:"route"`
	Method       string    `json:"method"`
	ClientIP     string    `json:"clientIP"`
	StatusCode   int       `json:"statusCode"`
	LatencyMs    float64   `json:"latencyMs"`
	RateLimited  bool      `json:"rateLimited"`
	ChaosLatency float64   `json:"chaosLatencyMs,omitempty"`
	ChaosError   bool      `json:"chaosError,omitempty"`
}
