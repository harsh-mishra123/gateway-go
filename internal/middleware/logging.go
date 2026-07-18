package middleware

import (
	"log"
	"net"
	"net/http"
	"strings"
	"time"
)

// responseCapture wraps http.ResponseWriter to capture the status code
// written by downstream handlers.
type responseCapture struct {
	http.ResponseWriter
	statusCode int
	written    bool
}

func (rc *responseCapture) WriteHeader(code int) {
	if !rc.written {
		rc.statusCode = code
		rc.written = true
	}
	rc.ResponseWriter.WriteHeader(code)
}

func (rc *responseCapture) Write(b []byte) (int, error) {
	if !rc.written {
		rc.statusCode = http.StatusOK
		rc.written = true
	}
	return rc.ResponseWriter.Write(b)
}

// Logging returns a middleware that logs each request's method, path, client IP,
// response status, and round-trip latency.
func Logging() Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			rc := &responseCapture{ResponseWriter: w, statusCode: http.StatusOK}

			next.ServeHTTP(rc, r)

			log.Printf("%s %s %s -> %d (%s)",
				r.Method,
				r.URL.Path,
				ClientIP(r),
				rc.statusCode,
				time.Since(start).Round(time.Millisecond),
			)
		})
	}
}

// ClientIP extracts the client's IP address from the request, checking
// X-Forwarded-For and X-Real-IP headers before falling back to RemoteAddr.
func ClientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		// Take the first IP in the chain (the original client).
		if i := strings.Index(xff, ","); i > 0 {
			return strings.TrimSpace(xff[:i])
		}
		return strings.TrimSpace(xff)
	}
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return strings.TrimSpace(xri)
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
