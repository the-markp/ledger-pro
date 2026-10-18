# LedgerPro — Engineering Project Billing, Payment Tracker & Reports

**LedgerPro** is a comprehensive, production-grade billing ledger and financial tracking platform designed specifically for engineering consultancies, architectural studios, and multidisciplinary design firms.

It streamlines transaction recording, payment status tracking, weekly and monthly spending analyses, and instant export to professional Excel (.xlsx) spreadsheets and PDF statements of account.

---

## ✨ Key Features

1. **Transaction Ledger & Calculation Engine**
   - **Full Discipline Tracking**: Dedicated scope allocation for **EE** (Electrical), **Pl** (Plumbing), **St** (Structural), **Arch** (Architectural), **ECE** (Electronics & Communications), **ME** (Mechanical), and **Others**.
   - **Automated Financial Formulas**: `Total Bill = Professional Bill + Print Cost`. Real-time balance calculations (`Balance = Total Bill - Amount Paid`).
   - **Comprehensive Fields**: Date, Client, Project Name, Disciplines, Purpose/Milestone, Bill, Print Cost, Total Bill, Payment Status, Amount Paid, Balance, Payment Date, Payment Reference, and Remarks.
   - **Payment Status Tracking**: Track records as `Paid`, `Partially Paid`, `Pending`, or `Overdue` with quick one-click payment settlement modals and batch status operations.

2. **Weekly & Monthly Spending Reports**
   - **Weekly Reports**: Groups transactions by calendar weeks (Monday–Sunday) with weekly billings, blueprint print expenditures, collection ratios, and expandable transaction details.
   - **Monthly Reports**: Chronological breakdown by billing month with client spending rankings and engineering discipline cost allocations.
   - **Analytics & Trends**: Visual metrics for collection efficiency, top-spending clients, and discipline workload demand.

3. **Multi-Format Accounting Export**
   - **Excel (.xlsx)**: Formatted workbooks with automated column widths, currency values, grand total summary formulas, and client breakdown sheets.
   - **PDF Reports**: Clean landscape ledger tables and branded single **Statement of Account / Billing Invoices** with official signature blocks.
   - **Clean Currency Formatting**: Philippine Peso (`PHP ₱`) currency representation formatted to prevent `+/-` or `±` encoding glitches in PDF viewers.

4. **Multi-Company Branding & Custom Logo**
   - Customize company name, tagline, business address, contact numbers, TIN, and authorized signatory details.
   - Upload custom PNG/JPEG company logos or select preset engineering icons and brand accent colors.

5. **Role-Based Access Control (RBAC) & Self-Nominated PINs**
   - **Admin**: Full administrative authority — manage transactions, edit company branding, manage user accounts, change roles, and perform backups/restores.
   - **Editor**: Operational authority — record new transactions, edit project scopes, update payment statuses, and export accounting reports.
   - **Viewer**: Read-only access — view the transaction ledger, browse weekly/monthly spending reports, and export documents.
   - **Self-Nominated PIN**: Secure 4–6 digit user-defined PIN for fast, frictionless authentication without external server dependencies.

6. **Comprehensive Backup & Restore**
   - Export full JSON database backups including transaction history, company profiles, and user accounts.
   - Restore backups with a validation preview card and choose between **Clean Replace** or **Merge** strategies.

---

## 👥 Default Demo Credentials

When first launching the application, you can sign in using any of the default accounts:

| Username | Role | Default PIN | Permissions Scope |
| :--- | :--- | :--- | :--- |
| `admin` | **Admin** | `1234` | Full Control (Ledger, Branding, Users, Backup & Restore) |
| `editor` | **Editor** | `1234` | Add / Edit Transactions, Record Payments, Export Reports |
| `viewer` | **Viewer** | `1234` | Read-only access to ledger, weekly & monthly reports |

> *Tip: Any user can update their self-nominated PIN at any time using the Key icon in the top header.*

---

## 🚀 Deployment Instructions

### 1. Docker Compose (Recommended)

The app is packaged in a lightweight, multi-stage Docker container based on Node 20 Alpine with an unprivileged system user (`appuser`) and an automatic health check.

```bash
# Clone or navigate to the project directory
cd /path/to/ledgerpro

# Build and start container in detached mode
docker compose up -d --build
```

Access the application at: **http://localhost:3000**

To monitor logs or stop the container:
```bash
# View live application logs
docker compose logs -f

# Stop and remove containers
docker compose down
```

---

### 2. Standard Docker CLI

```bash
# 1. Build the container image
docker build -t ledgerpro:latest .

# 2. Run container on port 3000
docker run -d \
  --name ledgerpro-app \
  -p 3000:3000 \
  --restart unless-stopped \
  ledgerpro:latest
```

---

### 3. Caddy Reverse Proxy Configuration

If you have **Caddy** already running on your server, simply point your domain or subdomain to port `3000`. Caddy will automatically manage TLS certificates and proxy traffic to LedgerPro.

#### Scenario A: Caddy running on the Host Machine
Add the following block to your `/etc/caddy/Caddyfile`:

```caddy
billing.yourdomain.com {
    reverse_proxy localhost:3000
}
```

Then reload Caddy:
```bash
sudo systemctl reload caddy
# or
caddy reload --config /etc/caddy/Caddyfile
```

#### Scenario B: Caddy in a Docker Network
If Caddy runs inside Docker, attach both containers to a shared Docker bridge network (e.g. `caddy_net`):

```caddy
billing.yourdomain.com {
    reverse_proxy ledgerpro-app:3000
}
```

---

### 4. Local Development (Node.js)

```bash
# Install dependencies
npm install

# Start local Vite development server
npm run dev
# Running on http://localhost:3000

# Typecheck and lint codebase
npm run lint

# Compile production bundle
npm run build
```

---

## 💾 Backup & Restore Procedure

### How to Create a Backup

1. Log in with an **Admin** or **Editor** account.
2. Click the **Backup** button in the top navigation header (or the **Backup & Restore** link in the footer).
3. Under the **Export System Backup** section:
   - Check **Include Company Branding & Signatories** (saves logo, company name, address, and TIN).
   - Check **Include User Accounts & Roles** (saves registered usernames and PINs).
4. Click **Download Full JSON Backup**.
5. A timestamped JSON file (e.g., `LedgerPro_Backup_Apex_Consulting_2026-10-18.json`) will be downloaded to your local device. Store this file in a secure location or offline storage.

### How to Restore from a Backup

1. Open the **Backup & Restore** modal from the header.
2. In the **Restore Database from File** section, click **Select JSON Backup File** and upload your previously saved `.json` file.
3. Review the **Backup File Verified** preview card, which shows:
   - Total transaction records
   - Registered users included
   - Company branding name and export timestamp
4. Select your desired restore strategy:
   - **Replace existing ledger (Clean overwrite)**: Clears current transactions and replaces them with the backup archive.
   - **Merge with existing records**: Adds any new records from the file while updating existing records that share matching IDs.
5. Click **Confirm & Restore Now**. The system will validate and apply the records immediately.

### Sample Data Reset

To reset the database to the initial set of engineering project samples (useful for demonstrations or testing):
- Open **Backup & Restore** and click **Reset Sample Data** at the bottom, or click the circular reset icon in the header bar.

---

## 🛡️ Security Hardening

- **Non-Root Execution**: The production Docker container executes under user `appuser` (UID 1000) rather than `root`.
- **Built-in Health Checks**: Built-in `/health` endpoint returning HTTP 200 JSON status.
- **Client-Side Data Ownership**: All transactions and settings remain stored on your host environment with zero third-party cloud data leakage.
