package middleware

import (
	"encoding/json"
	"net/http"

	"github.com/harsh-mishra123/gateway-go/internal/ratelimit"
)

// RateLimit returns a middleware that rejects requests exceeding the configured
// rate limit with a 429 status and a JSON error body.
func RateLimit(limiter *ratelimit.Limiter) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := ClientIP(r)
			route := r.URL.Path

			if !limiter.Allow(ip, route) {
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("Retry-After", "1")
				w.WriteHeader(http.StatusTooManyRequests)
				json.NewEncoder(w).Encode(map[string]string{
					"error": "rate limit exceeded",
				})
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
