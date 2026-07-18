package main

import (
	"context"
	"flag"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/harsh-mishra123/gateway-go/internal/admin"
	"github.com/harsh-mishra123/gateway-go/internal/chaos"
	"github.com/harsh-mishra123/gateway-go/internal/middleware"
	"github.com/harsh-mishra123/gateway-go/internal/proxy"
	"github.com/harsh-mishra123/gateway-go/internal/ratelimit"
	"github.com/harsh-mishra123/gateway-go/internal/rules"
)

func main() {
	backend := flag.String("backend", "http://localhost:4000", "backend server URL to proxy to")
	port := flag.String("port", "8080", "port the gateway listens on")
	flag.Parse()

	// Core dependencies.
	store := rules.NewStore()
	limiter := ratelimit.NewLimiter(store)
	defer limiter.Stop()
	chaosEngine := chaos.NewEngine(store)

	// Reverse proxy to the real backend.
	reverseProxy, err := proxy.NewProxy(*backend)
	if err != nil {
		log.Fatalf("failed to create proxy: %v", err)
	}

	// Build the middleware chain: logging -> rate limit -> chaos -> proxy.
	gatewayHandler := middleware.Chain(
		reverseProxy,
		middleware.Logging(),
		middleware.RateLimit(limiter),
		middleware.Chaos(chaosEngine),
	)

	// Admin API for rule management.
	adminHandler := admin.NewHandler(store)

	// Single mux that routes /api/* to admin and everything else through
	// the gateway middleware chain.
	mux := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") {
			adminHandler.ServeHTTP(w, r)
			return
		}
		gatewayHandler.ServeHTTP(w, r)
	})

	server := &http.Server{
		Addr:         ":" + *port,
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("gateway listening on :%s, forwarding to %s", *port, *backend)
		log.Printf("admin API available at http://localhost:%s/api/", *port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	// Graceful shutdown on SIGINT/SIGTERM.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit
	log.Printf("received %s, shutting down...", sig)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("forced shutdown: %v", err)
	}
	log.Println("gateway stopped")
}
