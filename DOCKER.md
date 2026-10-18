# LedgerPro - Docker Deployment Guide (with Caddy Reverse Proxy & Port 8001)

This application is containerized with a production Node 20 Alpine runtime, non-root user security hardening (`appuser`), full REST API support, and a built-in healthcheck. It is designed to sit behind your existing **Caddy** reverse proxy.

---

## 🔒 Port Configuration & Host Database Isolation

- **Application Port**: **8001** (`0.0.0.0:8001`)
- **Host Database Instance (Port 3304)**: LedgerPro does **NOT** bind, expose, or interfere with port **3304**. Any database instances running on your host machine on port `3304` remain completely untouched and conflict-free.

---

## 🚀 Quick Start with Docker Compose

To build and start the container:

```bash
docker compose up -d --build
```

The container listens on host port **8001** (`0.0.0.0:8001`).

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

# 2. Run the container on port 8001 (isolated from host DB on 3304)
docker run -d \
  --name ledgerpro-app \
  -p 8001:8001 \
  --restart unless-stopped \
  ledgerpro:latest
```

---

## 🔒 Caddy Reverse Proxy Configuration

Add either of the following snippets to your existing `Caddyfile`:

### Scenario 1: Caddy running on the host machine
```caddy
yourdomain.com {
    reverse_proxy localhost:8001
}
```

### Scenario 2: Caddy running in a Docker container (Shared Docker Network)
If Caddy and LedgerPro are connected to the same Docker network (e.g., `caddy_net`):

```caddy
yourdomain.com {
    reverse_proxy ledgerpro-app:8001
}
```

> **Tip:** Caddy will automatically provision and renew Let's Encrypt / ZeroSSL TLS certificates for your domain.

---

## 📱 Android App Connection to Backend

The LedgerPro Android companion application connects to this backend container:

- **From Android Studio Emulator**:
  ```text
  http://10.0.2.2:8001/api/
  ```
- **From Physical Android Phone (Local WiFi)**:
  ```text
  http://<HOST_LOCAL_IP>:8001/api/
  ```
- **From Production (via Caddy with HTTPS)**:
  ```text
  https://yourdomain.com/api/
  ```

---

## 🩺 Container Health Check

The container includes a built-in `/health` endpoint and `/api/status` endpoint:

```bash
curl http://localhost:8001/health
```
Response:
```json
{"status":"ok","timestamp":"2026-10-18T08:00:00.000Z"}
```

And test the REST API status:
```bash
curl http://localhost:8001/api/status
```
Response:
```json
{"status":"online","app":"LedgerPro","version":"2.1.0","currency":"PHP"}
```
