# ⚡ gateway-go

<div align="center">

![Go Version](https://img.shields.io/badge/Go-1.22+-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Clerk Auth](https://img.shields.io/badge/Auth-Clerk-6C47FF?style=for-the-badge&logo=clerk&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)

**A high-performance, programmatically controlled reverse proxy and chaos engineering gateway built in Go, featuring real-time WebSocket observability and an enterprise Next.js dashboard.**

[Explore Architecture](#-system-architecture) • [Getting Started](#-getting-started) • [API Reference](#-api--endpoint-reference) • [Chaos Playground](#-chaos-engineering-playground)

</div>

---

## 📌 Table of Contents

- [✨ Overview](#-overview)
- [🏗️ System Architecture](#%EF%B8%8F-system-architecture)
- [⚡ Key Capabilities](#-key-capabilities)
- [📂 Deep Dive Component Architecture](#-deep-dive-component-architecture)
- [🔌 API & Endpoint Reference](#-api--endpoint-reference)
- [🔑 Environment Variables](#-environment-variables)
- [🚀 Getting Started](#-getting-started)
- [🧪 Chaos Engineering Playground](#-chaos-engineering-playground)
- [🗺️ Directory Structure](#%EF%B8%8F-directory-structure)
- [📄 License](#-license)

---

## ✨ Overview

`gateway-go` bridges local development and production-grade network resilience. Standard microservices work perfectly on `localhost`, but frequently crash in production under network jitter, backend slowness, and throttling. 

`gateway-go` sits between your client applications and backend microservices, allowing software engineers to:
1. **Observe Traffic Live:** Real-time telemetry streamed via WebSockets to a sleek, dark-mode dashboard.
2. **Inject Chaos On-the-Fly:** Simulate artificial latency (e.g. 500ms delay) and probabilistic HTTP errors (500, 502, 503) without modifying code.
3. **Enforce Rate Limits:** Test client resilience under token bucket rate limiting.
4. **Enterprise Route Protection:** Next.js dashboard secured with Clerk authentication (Google & GitHub OAuth, protected route middleware).

---

## 🏗️ System Architecture

The following diagram illustrates how incoming client requests flow through `gateway-go`'s middleware chain to your backend while streaming real-time metrics to the dashboard:

```mermaid
flowchart TD
    subgraph Client Layer
        Browser["🌐 Browser / Mobile App"]
        Dashboard["💻 Next.js Dashboard (Clerk Auth)"]
    end

    subgraph gateway-go Gateway [Port 8080]
        Router{"HTTP Router / Mux"}
        
        subgraph Admin & Metrics API
            AdminAPI["/api/rules (CORS Enabled)"]
            WSHub["/ws/metrics (WebSocket Hub)"]
        end

        subgraph Middleware Pipeline
            M1["1. Metrics Middleware"]
            M2["2. Logging Middleware"]
            M3["3. Token Bucket Rate Limiter"]
            M4["4. Chaos Injection Engine"]
            Proxy["5. Reverse Proxy Engine"]
        end
    end

    subgraph Backend Microservices
        TargetServer["🎯 Target Backend (e.g. localhost:4000)"]
    end

    Browser -->|HTTP Requests| Router
    Dashboard -->|REST (Hot-reload Rules)| AdminAPI
    Dashboard <==>|WebSocket Stream| WSHub

    Router -->|Path: /api/*| AdminAPI
    Router -->|Path: /ws/*| WSHub
    Router -->|Path: /*| M1

    M1 --> M2 --> M3 --> M4 --> Proxy
    Proxy -->|Forward HTTP| TargetServer
    TargetServer -->|Response| Proxy
    M1 -.->|Broadcast Event| WSHub
```

---

## ⚡ Key Capabilities

| Feature | Description | Tech Stack / Package |
| :--- | :--- | :--- |
| **Hot-Reloadable Rule Store** | Thread-safe in-memory store supporting instant rule updates via REST without gateway restarts. | `internal/rules` (`sync.RWMutex`) |
| **Token Bucket Limiter** | Atomic token bucket rate-limiter with lazy refill calculation per client IP. | `internal/ratelimit` |
| **Chaos Injection Engine** | Configurable latency delay insertion and probabilistic error status generation (500, 502, 503). | `internal/chaos` |
| **Live Metrics Telemetry** | Non-blocking event broadcasting over WebSockets to all connected clients. | `internal/metrics` (Goroutines + Channels) |
| **Enterprise Dashboard** | Next.js 16 App Router interface with live traffic feed, heatmaps, and rule control panel. | Next.js 16, React 19, TypeScript |
| **Strict Route Protection** | Production-ready auth supporting Google & GitHub OAuth with Clerk middleware protection. | `@clerk/nextjs` |

---

## 📂 Deep Dive Component Architecture

<details>
<summary>🔍 <b>Click to expand Go Gateway Backend Details</b></summary>

<br />

The Go gateway is designed for high concurrency with zero third-party framework overhead, relying heavily on standard library `net/http` performance:

### Package Overview:
- **`main.go`**: Initializes `Store`, `Limiter`, `ChaosEngine`, `MetricsHub`, wires the middleware pipeline, and manages graceful shutdown on `SIGINT`/`SIGTERM`.
- **`internal/rules`**: Manages dynamic rules (Rate Limit, Chaos Latency, Chaos Error) with thread-safe `RWMutex` locks.
- **`internal/ratelimit`**: Tracks client tokens dynamically. Cleans up stale client buckets automatically.
- **`internal/chaos`**: Intercepts requests matching active rules to inject sleep durations or interrupt execution with target status codes.
- **`internal/metrics`**: Implements a central hub pattern with registered WebSocket connections to push non-blocking metrics JSON frames.
- **`internal/proxy`**: Wraps `httputil.SingleHostReverseProxy` with custom error handlers.
- **`internal/middleware`**: Clean composable middleware chain pattern: `middleware.Chain(proxy, metrics, logging, rateLimit, chaos)`.

</details>

<details>
<summary>🔍 <b>Click to expand Next.js Dashboard & Clerk Auth Details</b></summary>

<br />

The frontend dashboard provides real-time monitoring and dynamic rule manipulation:

### Dashboard Highlights:
- **Clerk Auth Provider**: Wrapped around `<ThemeProvider>` in [app/layout.tsx](file:///Users/harshmishra/Desktop/gateway-go/dashboard/src/app/layout.tsx).
- **Strict Route Protection**: Configured in [src/middleware.ts](file:///Users/harshmishra/Desktop/gateway-go/dashboard/src/middleware.ts) using `clerkMiddleware()` and `createRouteMatcher()`. All paths except `/`, `/sign-in(.*)`, and `/sign-up(.*)` redirect unauthenticated visitors to `/sign-in`.
- **Pre-built OAuth UI**: Dedicated `/sign-in` and `/sign-up` routes using Clerk's `<SignIn />` and `<SignUp />` components with custom styled background grids.
- **User Management**: Header features Clerk's `<UserButton />` for profile management and clean sign-out.
- **Live Traffic Feed**: Real-time table of incoming proxy requests with status badges, latencies, and rate-limit indicators.
- **Latency Heatmap**: Visual matrix highlighting response times under heavy load.
- **Rule Editor**: UI interface for creating, enabling, and deleting traffic control rules live.

</details>

---

## 🔌 API & Endpoint Reference

### Admin REST API (`http://localhost:8080/api`)

| Method | Endpoint | Description | Payload / Response |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Gateway health check status | `{"status": "ok"}` |
| `GET` | `/api/rules` | Fetch all dynamic traffic rules | `[{"id": "rule-1", ...}]` |
| `POST` | `/api/rules` | Create or update a dynamic rule | Rule JSON Object |
| `DELETE` | `/api/rules?id={id}` | Delete a specific rule by ID | `{"status": "deleted"}` |

<details>
<summary>📋 <b>Click for Example Rule Creation Payloads</b></summary>

#### Rate Limit Rule Payload:
```json
{
  "id": "rate-limit-global",
  "name": "Global 10 Req/Sec Throttling",
  "type": "rate_limit",
  "enabled": true,
  "rateLimit": {
    "requestsPerSecond": 10,
    "burst": 20
  }
}
```

#### Chaos Latency Rule Payload:
```json
{
  "id": "chaos-latency-spike",
  "name": "500ms Latency Injection",
  "type": "chaos",
  "enabled": true,
  "chaos": {
    "delayMs": 500,
    "errorPercentage": 0
  }
}
```

#### Chaos Error Rule Payload:
```json
{
  "id": "chaos-503-injection",
  "name": "25% Error Rate Injection",
  "type": "chaos",
  "enabled": true,
  "chaos": {
    "delayMs": 0,
    "errorPercentage": 25,
    "statusCode": 503
  }
}
```

</details>

### WebSocket Real-time Telemetry Stream

- **URL:** `ws://localhost:8080/ws/metrics`
- **Sample Event Frame Broadcast:**
```json
{
  "timestamp": "2026-07-20T21:07:56Z",
  "method": "GET",
  "path": "/api/users",
  "statusCode": 200,
  "latencyMs": 14,
  "clientIp": "127.0.0.1",
  "rateLimited": false
}
```

---

## 🔑 Environment Variables

To run the Next.js Dashboard with Clerk authentication, configure `.env.local` in the `dashboard/` directory:

| Variable Name | Required | Description | Example |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | **Yes** | Clerk Publishable API Key | `pk_test_...` |
| `CLERK_SECRET_KEY` | **Yes** | Clerk Secret API Key | `sk_test_...` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | **Yes** | Relative route for sign-in | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | **Yes** | Relative route for sign-up | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | **Yes** | Redirect target post sign-in | `/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | **Yes** | Redirect target post sign-up | `/dashboard` |

> ℹ️ *Note: A template `.env.example` is included in `dashboard/`. Do NOT commit real secrets in `.env.local` to public version control.*

---

## 🚀 Getting Started

### Prerequisites
- **Go**: Version 1.22 or higher installed (`go version`)
- **Node.js**: Version 18.0 or higher installed (`node -v`)
- **Clerk Account**: Free account at [clerk.com](https://clerk.com) for OAuth keys

### Step 1: Clone Repository
```bash
git clone https://github.com/harsh-mishra123/gateway-go.git
cd gateway-go
```

### Step 2: Start the Go Gateway Backend
```bash
# Optional: run a sample dummy backend on port 4000 (or point to your own server)
# Run gateway-go listening on :8080 and forwarding to :4000
go run main.go -port=8080 -backend=http://localhost:4000
```

### Step 3: Setup & Launch Dashboard
```bash
cd dashboard

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Add your Clerk Keys in .env.local:
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
# CLERK_SECRET_KEY=sk_test_...

# Start dev server
npm run dev
```

Open your browser to `http://localhost:3000`. You will be greeted by the gateway landing page, or redirected to `/sign-in` when navigating to `/dashboard`.

---

## 🧪 Chaos Engineering Playground

Test your application's resilience by injecting fault conditions with `curl`:

<details>
<summary>▶️ <b>Test 1: Verify Health Check</b></summary>

```bash
curl -i http://localhost:8080/api/health
```
**Expected Response:** `HTTP/1.1 200 OK`, `{"status":"ok"}`

</details>

<details>
<summary>▶️ <b>Test 2: Inject 500ms Latency Spike</b></summary>

```bash
curl -X POST http://localhost:8080/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "id": "delay-rule",
    "name": "Simulate Latency",
    "type": "chaos",
    "enabled": true,
    "chaos": { "delayMs": 500, "errorPercentage": 0 }
  }'
```
Now send any HTTP request through the gateway:
```bash
time curl http://localhost:8080/some-route
```
Notice the added delay!

</details>

<details>
<summary>▶️ <b>Test 3: Enable 429 Rate Limiting</b></summary>

```bash
curl -X POST http://localhost:8080/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "id": "rate-limit-strict",
    "name": "Strict Throttling",
    "type": "rate_limit",
    "enabled": true,
    "rateLimit": { "requestsPerSecond": 2, "burst": 2 }
  }'
```
Fire rapid requests to hit `HTTP 429 Too Many Requests`:
```bash
for i in {1..10}; do curl -i http://localhost:8080/test; done
```

</details>

---

## 🗺️ Directory Structure

```
gateway-go/
├── main.go                     # Entrypoint & HTTP Mux Router setup
├── go.mod                      # Go module definition
├── go.sum                      # Go dependency checksums
├── internal/                   # Core Go Backend Packages
│   ├── admin/                  # REST API handlers for rules & health
│   ├── chaos/                  # Fault & latency injection engine
│   ├── metrics/                # WebSocket hub & client connection pool
│   ├── middleware/             # Composable HTTP middleware chain
│   ├── proxy/                  # Single host reverse proxy wrapper
│   ├── ratelimit/              # Dynamic token bucket rate limiter
│   └── rules/                  # Thread-safe sync.RWMutex rule store
└── dashboard/                  # Next.js Dashboard Frontend
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx      # Root layout with ClerkProvider
    │   │   ├── page.tsx        # Public landing page
    │   │   ├── globals.css     # Design system & dark theme styles
    │   │   ├── dashboard/      # Protected dashboard page & header UserButton
    │   │   ├── sign-in/        # Pre-built Clerk SignIn page
    │   │   └── sign-up/        # Pre-built Clerk SignUp page
    │   ├── components/         # LiveFeed, LatencyHeatmap, RuleEditor, etc.
    │   ├── context/            # ThemeContext state management
    │   ├── hooks/              # Real-time WebSocket hook
    │   └── middleware.ts       # Clerk strict route protection middleware
    ├── .env.example            # Environment variables template
    ├── .env.local              # Local secrets (git-ignored)
    └── package.json            # Node dependencies (@clerk/nextjs, Next.js 16)
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

Made with ❤️ for high-availability systems & resilient API design.

</div>
