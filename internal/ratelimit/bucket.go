package ratelimit

import (
	"sync"
	"time"
)

// TokenBucket implements a classic token bucket algorithm. Tokens refill lazily
// on each call to Allow rather than via a background ticker, keeping the
// per-bucket overhead near zero when traffic is idle.
type TokenBucket struct {
	mu         sync.Mutex
	tokens     float64
	maxTokens  float64
	refillRate float64 // tokens per second
	lastRefill time.Time
}

// NewTokenBucket creates a bucket that holds at most maxTokens tokens and
// refills at refillRate tokens per second. It starts full.
func NewTokenBucket(maxTokens, refillRate float64) *TokenBucket {
	return &TokenBucket{
		tokens:     maxTokens,
		maxTokens:  maxTokens,
		refillRate: refillRate,
		lastRefill: time.Now(),
	}
}

// Allow attempts to consume one token. It returns true if the request is
// permitted, false if the bucket is empty. Tokens are refilled based on the
// elapsed time since the last call.
func (b *TokenBucket) Allow() bool {
	b.mu.Lock()
	defer b.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(b.lastRefill).Seconds()
	b.tokens += elapsed * b.refillRate
	if b.tokens > b.maxTokens {
		b.tokens = b.maxTokens
	}
	b.lastRefill = now

	if b.tokens < 1 {
		return false
	}
	b.tokens--
	return true
}

// LastUsed returns the time the bucket was last checked, useful for stale
// bucket cleanup.
func (b *TokenBucket) LastUsed() time.Time {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.lastRefill
}
