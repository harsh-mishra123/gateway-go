package chaos

import (
	"math/rand"
	"strconv"
	"time"

	"github.com/harsh-mishra123/gateway-go/internal/rules"
)

// Engine evaluates chaos rules against incoming requests. It reads rules from
// the shared rule store on every check so that rule changes take effect
// immediately without restarts.
type Engine struct {
	store *rules.Store
}

// NewEngine creates a chaos engine backed by the given rule store.
func NewEngine(store *rules.Store) *Engine {
	return &Engine{store: store}
}

// GetLatency returns the total artificial delay to inject for the given route.
// If multiple latency rules match, their delays are summed.
func (e *Engine) GetLatency(route string) time.Duration {
	matched := e.store.GetChaosRulesForRoute(route)
	var total time.Duration
	for _, r := range matched {
		total += r.LatencyDuration()
	}
	return total
}

// ShouldFail checks whether the request to the given route should be
// artificially failed. If multiple error_rate rules match, any one triggering
// is enough to fail the request.
func (e *Engine) ShouldFail(route string) bool {
	matched := e.store.GetChaosRulesForRoute(route)
	for _, r := range matched {
		if r.Type != rules.ChaosErrorRate {
			continue
		}
		rate, err := strconv.ParseFloat(r.Value, 64)
		if err != nil || rate <= 0 {
			continue
		}
		if rand.Float64() < rate {
			return true
		}
	}
	return false
}
