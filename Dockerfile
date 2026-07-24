FROM golang:1.23-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git ca-certificates

COPY go.mod go.sum ./
RUN go mod download

COPY main.go ./
COPY internal/ ./internal/

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o gateway main.go

FROM alpine:3.20 AS runner

WORKDIR /app

RUN addgroup -S gateway && adduser -S gateway -G gateway

COPY --from=builder /app/gateway /app/gateway
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

USER gateway

EXPOSE 8080

ENTRYPOINT ["/app/gateway"]
CMD ["-port=8080", "-backend=http://mock-backend:4000"]
