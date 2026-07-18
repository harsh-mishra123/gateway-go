package middleware

import (
	"context"
	"net/http"
	"time"

	"github.com/harsh-mishra123/gateway-go/internal/metrics"
)

type contextKey string

const (
	ctxKeyRateLimited  contextKey = "rateLimited"
	ctxKeyChaosLatency contextKey = "chaosLatency"
	ctxKeyChaosError   contextKey = "chaosError"
)

// Metrics returns a middleware that emits a metric event for every request
// after it has been processed by the rest of the chain. It should be the
// outermost middleware so it captures the full request lifecycle.
func Metrics(hub *metrics.Hub) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			rc := &responseCapture{ResponseWriter: w, statusCode: http.StatusOK}

			next.ServeHTTP(rc, r)

			latency := time.Since(start)

			m := metrics.Metric{
				Timestamp:  start,
				Route:      r.URL.Path,
				Method:     r.Method,
				ClientIP:   ClientIP(r),
				StatusCode: rc.statusCode,
				LatencyMs:  float64(latency.Milliseconds()),
			}

			// Pull context values set by downstream middleware.
			if rl, ok := r.Context().Value(ctxKeyRateLimited).(bool); ok {
				m.RateLimited = rl
			}
			if cl, ok := r.Context().Value(ctxKeyChaosLatency).(float64); ok {
				m.ChaosLatency = cl
			}
			if ce, ok := r.Context().Value(ctxKeyChaosError).(bool); ok {
				m.ChaosError = ce
			}

			hub.Emit(m)
		})
	}
}

// WithRateLimited attaches a rate-limited flag to the request context.
func WithRateLimited(r *http.Request) *http.Request {
	return r.WithContext(context.WithValue(r.Context(), ctxKeyRateLimited, true))
}

// WithChaosLatency attaches the injected chaos latency (ms) to the request context.
func WithChaosLatency(r *http.Request, ms float64) *http.Request {
	return r.WithContext(context.WithValue(r.Context(), ctxKeyChaosLatency, ms))
}

// WithChaosError attaches a chaos-error flag to the request context.
func WithChaosError(r *http.Request) *http.Request {
	return r.WithContext(context.WithValue(r.Context(), ctxKeyChaosError, true))
}
