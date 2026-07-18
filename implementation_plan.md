# API Gateway with Real-Time Dashboard

Build a production-grade HTTP reverse proxy in Go with a live Next.js dashboard. The gateway sits between clients and a backend, applying rate limiting, chaos injection, and auth rules — all configurable at runtime through an admin API. Every request emits metrics streamed over WebSocket to a dashboard that visualizes traffic in real time.

## Environment

| Tool | Version |
|------|---------|
| Go | 1.26.4 (darwin/arm64) |
| Node.js | 22.18.0 |
| npm | 10.9.3 |
| Module | `github.com/harsh-mishra123/gateway-go` |

## External Dependencies

| Dependency | Purpose |
|------------|---------|
| `github.com/gorilla/websocket` | WebSocket upgrade + read/write for metrics streaming |
| `github.com/rs/cors` | CORS middleware for dashboard cross-origin requests |

No other third-party Go libraries. The reverse proxy, HTTP server, rate limiter, chaos engine, and rule store are all hand-rolled using the standard library (`net/http`, `net/http/httputil`, `sync`, `time`, `math/rand`, `encoding/json`).

The Next.js dashboard uses only built-in Next.js features plus native browser WebSocket API — no chart libraries, no state management libraries. The heatmap and visualizations are pure CSS + JS.

---

## Project Structure (Final State)

```
gateway-go/
  main.go                    -- entry point, wires everything together
  go.mod / go.sum
  internal/
    proxy/
      proxy.go               -- httputil.ReverseProxy wrapper
    middleware/
      chain.go               -- middleware chaining utility
      logging.go             -- request logging middleware
      ratelimit.go           -- rate limit check middleware
      chaos.go               -- chaos injection middleware
    ratelimit/
      bucket.go              -- token bucket implementation
      limiter.go             -- per-IP/route limiter with cleanup
    chaos/
      engine.go              -- chaos rule matching + execution
    rules/
      store.go               -- thread-safe in-memory rule store
      types.go               -- rule type definitions
    metrics/
      hub.go                 -- metrics channel + WebSocket broadcast
      types.go               -- metric event types
    admin/
      handler.go             -- admin HTTP API endpoints
  dashboard/                 -- Next.js app (created via create-next-app)
    src/
      app/
        page.tsx             -- main dashboard page
        layout.tsx           -- root layout
        globals.css          -- design system + styles
      components/
        LiveFeed.tsx          -- scrolling request table
        LatencyHeatmap.tsx    -- route x time heatmap
        RuleEditor.tsx        -- forms for rate limit + chaos rules
        ConnectionStatus.tsx  -- WebSocket connection indicator
      hooks/
        useWebSocket.ts       -- WebSocket connection hook
      lib/
        types.ts              -- shared TypeScript types
        api.ts                -- admin API client functions
```

---

## Phase 1 — Bare Reverse Proxy

Build the minimum: a Go HTTP server that forwards every request to a hardcoded backend. No rules, no dashboard, no middleware.

### [NEW] [proxy.go](file:///Users/harshmishra/Desktop/gateway-go/internal/proxy/proxy.go)
- Create a function `NewProxy(targetURL string) *httputil.ReverseProxy`
- Configure the director to rewrite `Host`, `X-Forwarded-For`, `X-Forwarded-Host`
- Add a custom error handler that logs proxy failures
- Add a `ModifyResponse` hook to inject `X-Gateway: gateway-go` header

### [MODIFY] [main.go](file:///Users/harshmishra/Desktop/gateway-go/main.go)
- Parse flags: `-backend` (default `http://localhost:4000`), `-port` (default `8080`)
- Create the proxy, wrap it in `http.Server`
- Log startup info (listening port, backend target)
- Handle graceful shutdown on SIGINT/SIGTERM

**Commit**: `add bare reverse proxy with configurable backend target`

### Verify
- Start a simple backend: `python3 -m http.server 4000`
- Start gateway: `go run main.go -backend http://localhost:4000`
- `curl localhost:8080` should return the backend's response
- Response should include `X-Gateway: gateway-go` header

---

## Phase 2 — Rules Engine + Rate Limiting + Chaos Injection

Build the in-memory rule store, rate limiter, chaos engine, and admin API. All configurable via HTTP — no dashboard yet, just curl/Postman.

### [NEW] [types.go](file:///Users/harshmishra/Desktop/gateway-go/internal/rules/types.go)
- `RateLimitRule`: `Route`, `MaxRequests`, `WindowSeconds`, `ClientIP` (optional, empty = all IPs)
- `ChaosRule`: `Route`, `Type` (latency | error_rate | blackhole), `Value` (duration string or float), `Enabled`

### [NEW] [store.go](file:///Users/harshmishra/Desktop/gateway-go/internal/rules/store.go)
- `RuleStore` struct with `sync.RWMutex`, maps for rate limit and chaos rules keyed by ID
- Methods: `AddRateLimitRule`, `RemoveRateLimitRule`, `GetRateLimitRules`, `GetRateLimitRulesForRoute`
- Methods: `AddChaosRule`, `RemoveChaosRule`, `GetChaosRules`, `GetChaosRulesForRoute`
- Each rule gets a UUID on creation

### [NEW] [bucket.go](file:///Users/harshmishra/Desktop/gateway-go/internal/ratelimit/bucket.go)
- `TokenBucket` struct: `tokens float64`, `maxTokens float64`, `refillRate float64`, `lastRefill time.Time`, `mu sync.Mutex`
- `Allow() bool` — refill based on elapsed time, then try to consume 1 token
- Lazy refill on each call (no background goroutine per bucket)

### [NEW] [limiter.go](file:///Users/harshmishra/Desktop/gateway-go/internal/ratelimit/limiter.go)
- `RateLimiter` struct: `buckets map[string]*TokenBucket`, `mu sync.RWMutex`, `store *rules.RuleStore`
- `Allow(clientIP, route string) bool` — lookup matching rule, get-or-create bucket for the key, call `bucket.Allow()`
- Background goroutine to clean up stale buckets every 60 seconds (buckets unused for > 5 minutes)

### [NEW] [engine.go](file:///Users/harshmishra/Desktop/gateway-go/internal/chaos/engine.go)
- `ChaosEngine` struct wrapping `*rules.RuleStore`
- `GetLatency(route string) time.Duration` — returns delay to inject, or 0
- `ShouldFail(route string) bool` — rolls against the error_rate probability
- Uses `math/rand` for probability checks

### [NEW] [chain.go](file:///Users/harshmishra/Desktop/gateway-go/internal/middleware/chain.go)
- `type Middleware func(http.Handler) http.Handler`
- `Chain(handler http.Handler, middlewares ...Middleware) http.Handler` — applies in order

### [NEW] [logging.go](file:///Users/harshmishra/Desktop/gateway-go/internal/middleware/logging.go)
- Logs: method, path, client IP, status code, latency
- Uses a custom `ResponseWriter` wrapper to capture the status code

### [NEW] [ratelimit.go](file:///Users/harshmishra/Desktop/gateway-go/internal/middleware/ratelimit.go)
- Calls `limiter.Allow(ip, route)`, returns 429 with JSON body if rejected

### [NEW] [chaos.go](file:///Users/harshmishra/Desktop/gateway-go/internal/middleware/chaos.go)
- Checks `engine.GetLatency` and sleeps, checks `engine.ShouldFail` and returns 500

### [NEW] [handler.go](file:///Users/harshmishra/Desktop/gateway-go/internal/admin/handler.go)
- `POST /api/rules/ratelimit` — add rate limit rule (JSON body)
- `DELETE /api/rules/ratelimit/{id}` — remove rate limit rule
- `GET /api/rules/ratelimit` — list all rate limit rules
- `POST /api/rules/chaos` — add chaos rule
- `DELETE /api/rules/chaos/{id}` — remove chaos rule
- `GET /api/rules/chaos` — list all chaos rules
- `GET /api/health` — health check endpoint
- All endpoints return JSON responses

### [MODIFY] [main.go](file:///Users/harshmishra/Desktop/gateway-go/main.go)
- Initialize `RuleStore`, `RateLimiter`, `ChaosEngine`
- Build middleware chain: logging -> rate limit -> chaos -> proxy
- Mount admin API on a separate mux under `/api/` prefix
- Use a single `http.Server` with path-based routing: `/api/*` goes to admin, everything else goes through the gateway middleware chain

**Commits** (in order):
1. `add rule types and thread-safe in-memory rule store`
2. `add token bucket rate limiter with stale bucket cleanup`
3. `add chaos injection engine with latency and error rate support`
4. `add middleware chain with logging, rate limiting, and chaos injection`
5. `add admin HTTP API for managing rules at runtime`
6. `wire up rules engine and middleware chain in main`

### Verify
- Start gateway, add rate limit via curl:
  ```
  curl -X POST localhost:8080/api/rules/ratelimit \
    -d '{"route":"/","maxRequests":5,"windowSeconds":10}'
  ```
- Rapid-fire requests and confirm 429 after limit is hit
- Add chaos rule and confirm latency injection:
  ```
  curl -X POST localhost:8080/api/rules/chaos \
    -d '{"route":"/","type":"latency","value":"500ms"}'
  ```

---

## Phase 3 — Metrics Pipeline + WebSocket Broadcast

Add the metrics channel and WebSocket endpoint. No dashboard yet — verify with `wscat`.

### [NEW] [types.go](file:///Users/harshmishra/Desktop/gateway-go/internal/metrics/types.go)
- `Metric` struct: `Timestamp`, `Route`, `ClientIP`, `Method`, `StatusCode`, `LatencyMs`, `RateLimited`, `ChaosInjected`
- JSON tags for WebSocket serialization

### [NEW] [hub.go](file:///Users/harshmishra/Desktop/gateway-go/internal/metrics/hub.go)
- `MetricsHub` struct: `clients map[*websocket.Conn]bool`, `register/unregister chan`, `events chan Metric`, `mu sync.RWMutex`
- `Run()` — goroutine that reads from events channel, broadcasts to all clients, handles register/unregister
- `HandleWebSocket(w, r)` — upgrades HTTP to WebSocket, registers client, reads (for ping/pong), unregisters on close
- `Emit(metric Metric)` — non-blocking send to events channel (drop if buffer full, don't block request handling)
- Buffer size: 1000 events

### Update middleware
- Update the logging middleware (or add a metrics middleware) to call `hub.Emit()` after each request completes
- Capture actual response status code via the wrapped ResponseWriter

### [MODIFY] [main.go](file:///Users/harshmishra/Desktop/gateway-go/main.go)
- Initialize `MetricsHub`, start its `Run()` goroutine
- Mount WebSocket endpoint at `/ws/metrics`
- Pass hub reference to middleware

**Commits**:
1. `add metrics types and WebSocket broadcast hub`
2. `emit request metrics from middleware pipeline`
3. `mount WebSocket endpoint and wire metrics hub to middleware`

### Verify
- Start gateway, connect with wscat: `wscat -c ws://localhost:8080/ws/metrics`
- Make requests via curl, see JSON events appear in wscat
- Open multiple wscat connections, confirm all receive events

---

## Phase 4 — Dashboard v1 (Live Request Feed)

Bootstrap a Next.js app and build the first view: a real-time scrolling table of requests.

### [NEW] `dashboard/` directory
- Scaffold with `npx -y create-next-app@latest ./` inside `dashboard/` directory
- TypeScript, App Router, no Tailwind (vanilla CSS), ESLint

### [NEW] [globals.css](file:///Users/harshmishra/Desktop/gateway-go/dashboard/src/app/globals.css)
- Dark theme design system with CSS custom properties
- Color palette: deep navy/charcoal background, electric blue/cyan accents, warm amber for warnings, red for errors
- Typography: Inter from Google Fonts
- Glassmorphism cards, smooth transitions, subtle shadows

### [NEW] [types.ts](file:///Users/harshmishra/Desktop/gateway-go/dashboard/src/lib/types.ts)
- `MetricEvent` type matching Go's `Metric` struct
- `RateLimitRule`, `ChaosRule` types matching Go's rule types

### [NEW] [useWebSocket.ts](file:///Users/harshmishra/Desktop/gateway-go/dashboard/src/hooks/useWebSocket.ts)
- Custom hook: connects to `ws://localhost:8080/ws/metrics`
- Auto-reconnect with exponential backoff
- Returns: `events[]`, `isConnected`, `connectionStatus`
- Keeps last 200 events in memory (ring buffer behavior)

### [NEW] [ConnectionStatus.tsx](file:///Users/harshmishra/Desktop/gateway-go/dashboard/src/components/ConnectionStatus.tsx)
- Animated dot: green pulse when connected, red when disconnected
- Shows connection state text

### [NEW] [LiveFeed.tsx](file:///Users/harshmishra/Desktop/gateway-go/dashboard/src/components/LiveFeed.tsx)
- Scrolling table: timestamp, method, route, client IP, status, latency
- Color-coded status badges (2xx green, 4xx amber, 5xx red)
- New rows animate in from the top
- Auto-scroll with pause-on-hover
- Shows rate-limited and chaos-injected indicators

### [NEW/MODIFY] [page.tsx](file:///Users/harshmishra/Desktop/gateway-go/dashboard/src/app/page.tsx)
- Header with gateway logo/title and connection status
- Stats bar: total requests, avg latency, error rate (computed client-side)
- LiveFeed component

**Commits**:
1. `scaffold Next.js dashboard with TypeScript and vanilla CSS`
2. `add dark theme design system and typography`
3. `add WebSocket hook with auto-reconnect`
4. `add live request feed with status badges and animations`

### Verify
- Start gateway, start dashboard (`npm run dev` in `dashboard/`)
- Open dashboard at `localhost:3000`
- Make requests to gateway, see them appear in the live feed in real time

---

## Phase 5 — Dashboard v2 (Heatmap + Rule Editor)

Add the latency heatmap visualization and the rule editor forms.

### [NEW] [api.ts](file:///Users/harshmishra/Desktop/gateway-go/dashboard/src/lib/api.ts)
- Functions: `addRateLimitRule()`, `removeRateLimitRule()`, `getRateLimitRules()`
- Functions: `addChaosRule()`, `removeChaosRule()`, `getChaosRules()`
- All call the gateway's admin API at `http://localhost:8080/api/...`

### [NEW] [LatencyHeatmap.tsx](file:///Users/harshmishra/Desktop/gateway-go/dashboard/src/components/LatencyHeatmap.tsx)
- Grid: X-axis = time buckets (last 60 seconds, 5s granularity = 12 columns), Y-axis = unique routes
- Each cell colored by average latency in that bucket: green (< 100ms) -> yellow (100-300ms) -> orange (300-700ms) -> red (> 700ms)
- Smooth color transitions using CSS `transition`
- Tooltip on hover showing exact values
- Auto-updates as new metrics arrive

### [NEW] [RuleEditor.tsx](file:///Users/harshmishra/Desktop/gateway-go/dashboard/src/components/RuleEditor.tsx)
- Two sections: Rate Limit Rules and Chaos Rules
- Rate limit form: route pattern, max requests, window (seconds)
- Chaos form: route pattern, type dropdown (latency/error_rate), value input
- Active rules displayed as dismissible cards/chips
- Delete button on each rule
- Success/error toast notifications on rule changes
- Optimistic UI updates

### [MODIFY] [page.tsx](file:///Users/harshmishra/Desktop/gateway-go/dashboard/src/app/page.tsx)
- Add tab navigation: Live Feed | Heatmap | Rules
- Integrate LatencyHeatmap and RuleEditor components
- Add summary statistics cards at top

### [MODIFY] [globals.css](file:///Users/harshmishra/Desktop/gateway-go/dashboard/src/app/globals.css)
- Add heatmap cell styles and color scale
- Add form styles for rule editor
- Add tab navigation styles
- Add toast notification animations

**Commits**:
1. `add admin API client functions for rule management`
2. `add latency heatmap with color-coded time buckets`
3. `add rule editor with rate limit and chaos configuration forms`
4. `add tab navigation and integrate all dashboard views`

### Verify
- Full end-to-end test:
  1. Start backend, gateway, dashboard
  2. Generate traffic with a loop: `for i in $(seq 1 50); do curl localhost:8080/; done`
  3. Watch live feed populate, heatmap light up
  4. Add chaos latency rule via dashboard UI
  5. Generate more traffic, see heatmap cells turn red
  6. Add rate limit rule, see 429s appear in feed
  7. Remove rules, see traffic normalize

---

## Phase 6 (Stretch) — Polish + Docker

> [!NOTE]
> Phase 6 is stretch scope. I'll implement it after phases 1-5 are solid.

- Multiple backend targets with round-robin load balancing
- Basic auth on the admin API (API key header)
- Rule persistence to a JSON file (load on startup, save on change)
- `docker-compose.yml` with gateway, a sample backend, and dashboard
- README with architecture diagram, setup instructions, and demo walkthrough

---

## Open Questions

> [!IMPORTANT]
> **Backend for testing**: During development I'll use Python's `http.server` as a dummy backend on port 4000. Should I instead build a small Go echo server that returns JSON responses with simulated latency? This would make demos more realistic.

> [!IMPORTANT]
> **Dashboard port**: The Next.js dashboard will run on port 3000 by default. The gateway runs on 8080. The admin API is served on the same port as the gateway (8080) under `/api/` prefix. Does this setup work for you, or do you want the admin API on a separate port?

> [!IMPORTANT]  
> **CORS**: The dashboard (port 3000) needs to call the gateway's admin API (port 8080). I'll add CORS headers to the admin API endpoints using `github.com/rs/cors`. Just confirming this is acceptable.

---

## Verification Plan

### Automated Tests
- `go build ./...` after every phase to ensure compilation
- `go vet ./...` for static analysis
- Manual curl-based integration testing at each phase (documented above)

### Manual Verification
- End-to-end demo after Phase 5: start all three components, generate traffic, manipulate rules live, watch dashboard respond in real time
- Test concurrent access: multiple clients hitting the gateway while rules are being modified
- Test WebSocket reconnection: kill and restart the gateway, confirm dashboard reconnects
