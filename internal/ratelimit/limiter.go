package ratelimit

import (
	"log"
	"sync"
	"time"

	"github.com/harsh-mishra123/gateway-go/internal/rules"
)

const (
	cleanupInterval = 60 * time.Second
	staleThreshold  = 5 * time.Minute
)

// Limiter manages per-client token buckets based on the current rate limit
// rules. Buckets are created lazily on first request and cleaned up when
// they go unused for longer than staleThreshold.
type Limiter struct {
	mu      sync.RWMutex
	buckets map[string]*TokenBucket
	store   *rules.Store
	stopCh  chan struct{}
}

// NewLimiter creates a limiter backed by the given rule store and starts a
// background goroutine that periodically evicts stale buckets.
func NewLimiter(store *rules.Store) *Limiter {
	l := &Limiter{
		buckets: make(map[string]*TokenBucket),
		store:   store,
		stopCh:  make(chan struct{}),
	}
	go l.cleanupLoop()
	return l
}

// Allow checks whether a request from clientIP to route should be permitted
// under the current rate limit rules. If no rule matches, the request is
// allowed by default.
func (l *Limiter) Allow(clientIP, route string) bool {
	matchedRules := l.store.GetRateLimitRulesForRoute(route, clientIP)
	if len(matchedRules) == 0 {
		return true
	}

	// Apply the most restrictive matching rule.
	var strictest *rules.RateLimitRule
	for i := range matchedRules {
		r := &matchedRules[i]
		if strictest == nil || r.RefillRate() < strictest.RefillRate() {
			strictest = r
		}
	}

	key := bucketKey(clientIP, strictest.Route, strictest.ID)
	bucket := l.getOrCreateBucket(key, strictest.MaxRequests, strictest.RefillRate())
	return bucket.Allow()
}

// Stop shuts down the background cleanup goroutine.
func (l *Limiter) Stop() {
	close(l.stopCh)
}

func (l *Limiter) getOrCreateBucket(key string, maxTokens, refillRate float64) *TokenBucket {
	l.mu.RLock()
	bucket, exists := l.buckets[key]
	l.mu.RUnlock()

	if exists {
		return bucket
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	// Double-check after acquiring write lock.
	if bucket, exists = l.buckets[key]; exists {
		return bucket
	}

	bucket = NewTokenBucket(maxTokens, refillRate)
	l.buckets[key] = bucket
	return bucket
}

func (l *Limiter) cleanupLoop() {
	ticker := time.NewTicker(cleanupInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			l.evictStale()
		case <-l.stopCh:
			return
		}
	}
}

func (l *Limiter) evictStale() {
	l.mu.Lock()
	defer l.mu.Unlock()

	cutoff := time.Now().Add(-staleThreshold)
	evicted := 0
	for key, bucket := range l.buckets {
		if bucket.LastUsed().Before(cutoff) {
			delete(l.buckets, key)
			evicted++
		}
	}
	if evicted > 0 {
		log.Printf("rate limiter: evicted %d stale buckets", evicted)
	}
}

func bucketKey(clientIP, route, ruleID string) string {
	return clientIP + "|" + route + "|" + ruleID
}
