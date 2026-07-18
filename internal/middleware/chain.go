package middleware

import "net/http"

// Middleware is a function that wraps an http.Handler with additional behavior.
type Middleware func(http.Handler) http.Handler

// Chain applies middlewares to a handler in the order they are provided.
// The first middleware in the list is the outermost (runs first on request,
// last on response).
func Chain(handler http.Handler, middlewares ...Middleware) http.Handler {
	// Apply in reverse so the first middleware listed wraps outermost.
	for i := len(middlewares) - 1; i >= 0; i-- {
		handler = middlewares[i](handler)
	}
	return handler
}
