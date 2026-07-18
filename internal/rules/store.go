package rules

import (
	"crypto/rand"
	"fmt"
	"sync"
)

// Store holds rate limit and chaos rules in memory, safe for concurrent access.
// Rules are keyed by a generated ID so they can be individually removed.
type Store struct {
	mu         sync.RWMutex
	rateLimits map[string]RateLimitRule
	chaosRules map[string]ChaosRule
}

// NewStore returns an initialized, empty rule store.
func NewStore() *Store {
	return &Store{
		rateLimits: make(map[string]RateLimitRule),
		chaosRules: make(map[string]ChaosRule),
	}
}

// AddRateLimitRule inserts a new rate limit rule and returns its assigned ID.
func (s *Store) AddRateLimitRule(rule RateLimitRule) string {
	s.mu.Lock()
	defer s.mu.Unlock()

	rule.ID = generateID()
	s.rateLimits[rule.ID] = rule
	return rule.ID
}

// RemoveRateLimitRule deletes a rate limit rule by ID.
// Returns true if the rule existed and was removed.
func (s *Store) RemoveRateLimitRule(id string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.rateLimits[id]; !exists {
		return false
	}
	delete(s.rateLimits, id)
	return true
}

// GetRateLimitRules returns a snapshot of all rate limit rules.
func (s *Store) GetRateLimitRules() []RateLimitRule {
	s.mu.RLock()
	defer s.mu.RUnlock()

	rules := make([]RateLimitRule, 0, len(s.rateLimits))
	for _, r := range s.rateLimits {
		rules = append(rules, r)
	}
	return rules
}

// GetRateLimitRulesForRoute returns all rate limit rules that match a given
// route and optionally a specific client IP. A rule matches if its Route field
// equals the requested route or is "/" (catch-all), and its ClientIP is either
// empty (applies to everyone) or matches the provided IP.
func (s *Store) GetRateLimitRulesForRoute(route, clientIP string) []RateLimitRule {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var matched []RateLimitRule
	for _, r := range s.rateLimits {
		if r.Route != route && r.Route != "/" {
			continue
		}
		if r.ClientIP != "" && r.ClientIP != clientIP {
			continue
		}
		matched = append(matched, r)
	}
	return matched
}

// AddChaosRule inserts a new chaos rule and returns its assigned ID.
func (s *Store) AddChaosRule(rule ChaosRule) string {
	s.mu.Lock()
	defer s.mu.Unlock()

	rule.ID = generateID()
	rule.Enabled = true
	s.chaosRules[rule.ID] = rule
	return rule.ID
}

// RemoveChaosRule deletes a chaos rule by ID.
// Returns true if the rule existed and was removed.
func (s *Store) RemoveChaosRule(id string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.chaosRules[id]; !exists {
		return false
	}
	delete(s.chaosRules, id)
	return true
}

// GetChaosRules returns a snapshot of all chaos rules.
func (s *Store) GetChaosRules() []ChaosRule {
	s.mu.RLock()
	defer s.mu.RUnlock()

	rules := make([]ChaosRule, 0, len(s.chaosRules))
	for _, r := range s.chaosRules {
		rules = append(rules, r)
	}
	return rules
}

// GetChaosRulesForRoute returns all enabled chaos rules matching the given route.
func (s *Store) GetChaosRulesForRoute(route string) []ChaosRule {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var matched []ChaosRule
	for _, r := range s.chaosRules {
		if !r.Enabled {
			continue
		}
		if r.Route != route && r.Route != "/" {
			continue
		}
		matched = append(matched, r)
	}
	return matched
}

// generateID produces a short random hex string suitable for rule identification.
func generateID() string {
	b := make([]byte, 8)
	rand.Read(b)
	return fmt.Sprintf("%x", b)
}
