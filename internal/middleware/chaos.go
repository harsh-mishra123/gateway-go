package middleware

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/harsh-mishra123/gateway-go/internal/chaos"
)

// Chaos returns a middleware that injects artificial latency or errors based
// on the current chaos rules for the requested route.
func Chaos(engine *chaos.Engine) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			route := r.URL.Path

			// Inject artificial latency if configured.
			if delay := engine.GetLatency(route); delay > 0 {
				log.Printf("chaos: injecting %s latency for %s", delay, route)
				time.Sleep(delay)
			}

			// Inject artificial failure if the random roll says so.
			if engine.ShouldFail(route) {
				log.Printf("chaos: injecting 500 error for %s", route)
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(map[string]string{
					"error": "chaos-injected failure",
				})
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
