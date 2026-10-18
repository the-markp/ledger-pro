# LedgerPro - Docker Deployment Guide (with PostgreSQL Database & Port 8001)

This application is containerized with a production Node 20 Alpine runtime, non-root user security hardening (`appuser`), full REST API support, built-in healthchecks, and an integrated **PostgreSQL 16 relational database** with persistent volume storage. It is designed to run standalone or sit behind your existing **Caddy** reverse proxy.

---

## 🔒 Port Configuration & Host Database Isolation

- **Application Port**: **8001** (`0.0.0.0:8001`)
- **PostgreSQL Container Host Port**: **5433** (`0.0.0.0:5433` -> container `5432` / internal Docker network)
- **Host PostgreSQL Instance (Port 5432)**: LedgerPro maps its database to host port **5433** (configurable via `POSTGRES_HOST_PORT`), so your host's existing PostgreSQL on port **5432** is completely untouched and free of port conflicts.
- **Host Database Instance (Port 3304)**: LedgerPro does **NOT** bind, expose, or interfere with port **3304**. Any database instances running on your host machine on port `3304` remain completely untouched and conflict-free.

---

## 🐘 PostgreSQL Persistent Database Architecture

LedgerPro includes a multi-service Docker Compose setup with PostgreSQL 16:

1. **Persistent Data Volume (`postgres_data`)**:
   - Mapped to `/var/lib/postgresql/data` in the database container.
   - All transactions, client billings, payments, registered user accounts, and company branding persist across container restarts, stops, and rebuilds.

2. **Automated Schema Initialization & Seeding**:
   - On first startup, LedgerPro automatically executes relational table migrations:
     - `transactions` (project name, engineering disciplines, fees, print costs, payments, balance)
     - `users` (admin, editor, viewer, role-based access, and PINs)
     - `company_profile` (engineering firm branding, logo, signatory information)
     - `system_settings` (currency and system preferences)
   - If tables are empty, it automatically populates the default initial engineering projects and administrative accounts (Admin PIN: `1234`).

3. **Resilient Dual Storage Architecture**:
   - When PostgreSQL is running, it is the primary ACID relational source of truth.
   - The system also maintains an automated JSON backup snapshot in `data/database.json`.

---

## 🚀 Quick Start with Docker Compose

To build and launch both LedgerPro and PostgreSQL:

```bash
docker compose up -d --build
```

### Checking Services & Health Status

```bash
# Verify both containers are running and healthy
docker compose ps

# View real-time logs from both services
docker compose logs -f

# View specifically PostgreSQL logs
docker compose logs -f postgres

# View specifically LedgerPro backend logs
docker compose logs -f ledgerpro
```

### Stopping Services

```bash
# Stop containers (preserves database data volume)
docker compose down

# Stop containers and remove volumes (WARNING: wipes persistent data)
# docker compose down -v
```

---

## ⚙️ Environment Variables & Credentials

The database service uses the following defaults (customizable via `.env`):

| Variable | Default Value | Description |
|---|---|---|
| `POSTGRES_DB` | `ledgerpro_db` | PostgreSQL database name |
| `POSTGRES_USER` | `ledgerpro_user` | PostgreSQL database user |
| `POSTGRES_PASSWORD` | `ledgerpro_password` | PostgreSQL password |
| `DATABASE_URL` | `postgres://ledgerpro_user:ledgerpro_password@postgres:5432/ledgerpro_db` | Connection string |
| `PORT` | `8001` | Host port for LedgerPro web & REST API |
| `HOST` | `0.0.0.0` | Bind interface |

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

## 🩺 Container & Database Health Check

The containers include built-in healthchecks:

```bash
# 1. Check HTTP server health & database mode
curl http://localhost:8001/health
```

Expected Response:
```json
{
  "status": "ok",
  "database": "PostgreSQL",
  "timestamp": "2026-10-18T13:00:00.000Z"
}
```

```bash
# 2. Check REST API status with live PostgreSQL transaction & user statistics
curl http://localhost:8001/api/status
```

Expected Response:
```json
{
  "status": "online",
  "app": "LedgerPro",
  "service": "Backend API Service",
  "version": "2.1.0",
  "database": {
    "type": "PostgreSQL",
    "status": "connected",
    "postgres": true
  },
  "currency": "PHP",
  "stats": {
    "transactionsCount": 5,
    "usersCount": 3,
    "company": "Vertex Engineering & Design Consultancy"
  }
}
```

---

## 🔍 Connecting Directly to PostgreSQL with `psql`

To inspect or query the database tables directly:

```bash
# Open interactive PostgreSQL shell inside container
docker exec -it ledgerpro-postgres psql -U ledgerpro_user -d ledgerpro_db

# Example SQL queries inside psql:
# \dt                             -- List all tables
# SELECT id, client, total_bill, payment_status FROM transactions;
# SELECT id, username, full_name, role FROM users;
```
