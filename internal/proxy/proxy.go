package proxy

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
)

// NewProxy creates a reverse proxy that forwards requests to the given target URL.
// It rewrites headers to maintain correct routing and adds a gateway identifier
// to outbound responses.
func NewProxy(targetURL string) (*httputil.ReverseProxy, error) {
	target, err := url.Parse(targetURL)
	if err != nil {
		return nil, err
	}

	proxy := httputil.NewSingleHostReverseProxy(target)

	// Override the director to set forwarding headers properly.
	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		originalDirector(req)
		req.Header.Set("X-Forwarded-Host", req.Host)
		req.Host = target.Host
	}

	// Tag every proxied response so clients can tell they went through the gateway.
	proxy.ModifyResponse = func(resp *http.Response) error {
		resp.Header.Set("X-Gateway", "gateway-go")
		return nil
	}

	// Log proxy-level errors (target unreachable, timeouts, etc.) instead of
	// silently swallowing them.
	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		log.Printf("proxy error: %s %s -> %v", r.Method, r.URL.Path, err)
		w.WriteHeader(http.StatusBadGateway)
		w.Write([]byte(`{"error":"bad gateway"}`))
	}

	return proxy, nil
}
