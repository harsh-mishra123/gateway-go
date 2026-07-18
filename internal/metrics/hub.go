package metrics

import (
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

const eventBufferSize = 1000

var upgrader = websocket.Upgrader{
	// Allow connections from the dashboard running on a different port.
	CheckOrigin: func(r *http.Request) bool { return true },
}

// Hub manages WebSocket clients and broadcasts metric events to all connected
// dashboard instances. It decouples the request-handling hot path from slow
// WebSocket writes by using a buffered channel.
type Hub struct {
	mu         sync.RWMutex
	clients    map[*websocket.Conn]bool
	events     chan Metric
	register   chan *websocket.Conn
	unregister chan *websocket.Conn
}

// NewHub creates a metrics hub ready to accept clients and events.
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*websocket.Conn]bool),
		events:     make(chan Metric, eventBufferSize),
		register:   make(chan *websocket.Conn),
		unregister: make(chan *websocket.Conn),
	}
}

// Run starts the hub's main loop. It should be called in its own goroutine.
// It handles client registration, unregistration, and event broadcasting.
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("metrics: client connected (%d total)", h.clientCount())

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				client.Close()
			}
			h.mu.Unlock()
			log.Printf("metrics: client disconnected (%d total)", h.clientCount())

		case event := <-h.events:
			h.broadcast(event)
		}
	}
}

// Emit sends a metric event to the broadcast channel. If the channel buffer
// is full, the event is dropped to avoid blocking the request-handling path.
func (h *Hub) Emit(m Metric) {
	select {
	case h.events <- m:
	default:
		// Drop the event rather than block request handling.
	}
}

// HandleWebSocket upgrades an HTTP connection to WebSocket and registers the
// client with the hub. It blocks reading from the connection (for ping/pong)
// until the client disconnects.
func (h *Hub) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("metrics: websocket upgrade failed: %v", err)
		return
	}

	h.register <- conn

	// Block reading until the client disconnects. This keeps the goroutine
	// alive and allows the WebSocket to handle ping/pong frames.
	defer func() { h.unregister <- conn }()
	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			break
		}
	}
}

func (h *Hub) broadcast(event Metric) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.clients {
		if err := client.WriteJSON(event); err != nil {
			log.Printf("metrics: write failed, removing client: %v", err)
			go func(c *websocket.Conn) { h.unregister <- c }(client)
		}
	}
}

func (h *Hub) clientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}
