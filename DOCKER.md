# LedgerPro - Docker Deployment Guide (with Caddy Reverse Proxy)

This application is containerized with a production Node 20 Alpine runtime, non-root user security hardening (`appuser`), and a built-in healthcheck. It is designed to sit behind your existing **Caddy** reverse proxy.

---

## 🚀 Quick Start with Docker Compose

To build and start the container:

```bash
docker compose up -d --build
```

The container listens on port **3000** (`0.0.0.0:3000`).

To view logs or stop the container:
```bash
# View logs
docker compose logs -f

# Stop the container
docker compose down
```

---

## 🛠️ Build & Run with Standard Docker CLI

```bash
# 1. Build the image
docker build -t ledgerpro:latest .

# 2. Run the container
docker run -d \
  --name ledgerpro-app \
  -p 3000:3000 \
  --restart unless-stopped \
  ledgerpro:latest
```

---

## 🔒 Caddy Reverse Proxy Configuration

Add either of the following snippets to your existing `Caddyfile`:

### Scenario 1: Caddy running on the host machine
```caddy
yourdomain.com {
    reverse_proxy localhost:3000
}
```

### Scenario 2: Caddy running in a Docker container (Shared Docker Network)
If Caddy and LedgerPro are connected to the same Docker network (e.g., `caddy_net`):

```caddy
yourdomain.com {
    reverse_proxy ledgerpro-app:3000
}
```

> **Tip:** Caddy will automatically provision and renew Let's Encrypt / ZeroSSL TLS certificates for your domain.

---

## 🩺 Container Health Check

The container includes a built-in `/health` endpoint for monitoring and uptime probes:

```bash
curl http://localhost:3000/health
```
Response:
```json
{"status":"ok","timestamp":"2026-10-17T17:15:00.000Z"}
```
