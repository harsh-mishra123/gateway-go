package rules

import "time"

// RateLimitRule defines a rate limiting policy for a specific route.
// When ClientIP is empty, the rule applies to all clients hitting the route.
type RateLimitRule struct {
	ID            string  `json:"id"`
	Route         string  `json:"route"`
	MaxRequests   float64 `json:"maxRequests"`
	WindowSeconds int     `json:"windowSeconds"`
	ClientIP      string  `json:"clientIP,omitempty"`
}

// RefillRate returns the token refill rate per second for this rule.
func (r RateLimitRule) RefillRate() float64 {
	if r.WindowSeconds <= 0 {
		return r.MaxRequests
	}
	return r.MaxRequests / float64(r.WindowSeconds)
}

// ChaosType represents the kind of chaos to inject.
type ChaosType string

const (
	ChaosLatency   ChaosType = "latency"
	ChaosErrorRate ChaosType = "error_rate"
)

// ChaosRule defines a chaos injection policy for a specific route.
// For latency type, Value is a duration string (e.g. "500ms").
// For error_rate type, Value is a float between 0 and 1 (e.g. "0.3" for 30%).
type ChaosRule struct {
	ID      string    `json:"id"`
	Route   string    `json:"route"`
	Type    ChaosType `json:"type"`
	Value   string    `json:"value"`
	Enabled bool      `json:"enabled"`
}

// LatencyDuration parses the Value field as a time.Duration.
// Returns 0 if the rule type is not latency or the value is unparseable.
func (c ChaosRule) LatencyDuration() time.Duration {
	if c.Type != ChaosLatency {
		return 0
	}
	d, err := time.ParseDuration(c.Value)
	if err != nil {
		return 0
	}
	return d
}
