package main

import (
	"context"
	"flag"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/harsh-mishra123/gateway-go/internal/proxy"
)

func main() {
	backend := flag.String("backend", "http://localhost:4000", "backend server URL to proxy to")
	port := flag.String("port", "8080", "port the gateway listens on")
	flag.Parse()

	reverseProxy, err := proxy.NewProxy(*backend)
	if err != nil {
		log.Fatalf("failed to create proxy: %v", err)
	}

	mux := http.NewServeMux()
	mux.Handle("/", reverseProxy)

	server := &http.Server{
		Addr:         ":" + *port,
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start the server in a goroutine so we can listen for shutdown signals.
	go func() {
		log.Printf("gateway listening on :%s, forwarding to %s", *port, *backend)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	// Wait for SIGINT or SIGTERM, then drain connections gracefully.
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
