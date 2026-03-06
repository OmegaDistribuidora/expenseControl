FROM golang:1.24-alpine AS builder
WORKDIR /app

COPY go.mod ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o /out/backend-go ./cmd/server

FROM alpine:3.20
WORKDIR /app

COPY --from=builder /out/backend-go /app/backend-go

EXPOSE 8080
ENTRYPOINT ["/app/backend-go"]

