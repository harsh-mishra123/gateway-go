package admin

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/harsh-mishra123/gateway-go/internal/rules"
)

// Handler provides HTTP endpoints for managing gateway rules at runtime.
type Handler struct {
	store *rules.Store
	mux   *http.ServeMux
}

// NewHandler creates an admin API handler wired to the given rule store.
func NewHandler(store *rules.Store) *Handler {
	h := &Handler{
		store: store,
		mux:   http.NewServeMux(),
	}
	h.registerRoutes()
	return h
}

// ServeHTTP delegates to the internal mux.
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	h.mux.ServeHTTP(w, r)
}

func (h *Handler) registerRoutes() {
	h.mux.HandleFunc("/api/rules/ratelimit", h.handleRateLimit)
	h.mux.HandleFunc("/api/rules/ratelimit/", h.handleRateLimitByID)
	h.mux.HandleFunc("/api/rules/chaos", h.handleChaos)
	h.mux.HandleFunc("/api/rules/chaos/", h.handleChaosByID)
	h.mux.HandleFunc("/api/health", h.handleHealth)
}

func (h *Handler) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) handleRateLimit(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		rules := h.store.GetRateLimitRules()
		writeJSON(w, http.StatusOK, rules)

	case http.MethodPost:
		var rule rules.RateLimitRule
		if err := json.NewDecoder(r.Body).Decode(&rule); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
			return
		}
		if rule.Route == "" || rule.MaxRequests <= 0 || rule.WindowSeconds <= 0 {
			writeJSON(w, http.StatusBadRequest, map[string]string{
				"error": "route, maxRequests (>0), and windowSeconds (>0) are required",
			})
			return
		}
		id := h.store.AddRateLimitRule(rule)
		rule.ID = id
		writeJSON(w, http.StatusCreated, rule)

	default:
		w.Header().Set("Allow", "GET, POST")
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
	}
}

func (h *Handler) handleRateLimitByID(w http.ResponseWriter, r *http.Request) {
	id := extractID(r.URL.Path, "/api/rules/ratelimit/")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing rule id"})
		return
	}

	switch r.Method {
	case http.MethodDelete:
		if !h.store.RemoveRateLimitRule(id) {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "rule not found"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"deleted": id})

	default:
		w.Header().Set("Allow", "DELETE")
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
	}
}

func (h *Handler) handleChaos(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		rules := h.store.GetChaosRules()
		writeJSON(w, http.StatusOK, rules)

	case http.MethodPost:
		var rule rules.ChaosRule
		if err := json.NewDecoder(r.Body).Decode(&rule); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
			return
		}
		if rule.Route == "" || rule.Type == "" || rule.Value == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{
				"error": "route, type, and value are required",
			})
			return
		}
		if rule.Type != rules.ChaosLatency && rule.Type != rules.ChaosErrorRate {
			writeJSON(w, http.StatusBadRequest, map[string]string{
				"error": "type must be 'latency' or 'error_rate'",
			})
			return
		}
		id := h.store.AddChaosRule(rule)
		rule.ID = id
		rule.Enabled = true
		writeJSON(w, http.StatusCreated, rule)

	default:
		w.Header().Set("Allow", "GET, POST")
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
	}
}

func (h *Handler) handleChaosByID(w http.ResponseWriter, r *http.Request) {
	id := extractID(r.URL.Path, "/api/rules/chaos/")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing rule id"})
		return
	}

	switch r.Method {
	case http.MethodDelete:
		if !h.store.RemoveChaosRule(id) {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "rule not found"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"deleted": id})

	default:
		w.Header().Set("Allow", "DELETE")
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
	}
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func extractID(path, prefix string) string {
	return strings.TrimPrefix(path, prefix)
}
