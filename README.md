# LedgerPro — Engineering Project Billing, Payment Tracker & Reports

**LedgerPro** is a comprehensive, production-grade billing ledger and financial tracking platform designed specifically for engineering consultancies, architectural studios, and multidisciplinary design firms.

It streamlines transaction recording, payment status tracking in Philippine Peso (₱), weekly and monthly spending analyses, and instant export to professional Excel (.xlsx) spreadsheets and PDF statements of account. In addition to full web access, it includes a complete **native Android companion application** and a **containerized backend running on port 8001** behind Caddy.

---

## 🔒 Port Configuration & Host Database Isolation

- **Application Port**: **8001** (`0.0.0.0:8001` on host, mapped to `8001` in container)
- **Host Database Instance (Port 3304)**: LedgerPro does **NOT** bind, expose, or interfere with port **3304**. Any database instances running on your host machine on port `3304` remain completely untouched, isolated, and conflict-free.

---

## ✨ Key Features

1. **Transaction Ledger & Calculation Engine**
   - **Full Discipline Tracking**: Dedicated scope allocation for **EE** (Electrical), **Pl** (Plumbing), **St** (Structural), **Arch** (Architectural), **ECE** (Electronics & Communications), **ME** (Mechanical), and **Others**.
   - **Automated Financial Formulas**: `Total Bill = Professional Bill + Print Cost`. Real-time balance calculations (`Balance = Total Bill - Amount Paid`).
   - **Payment Tracking**: Track records as `Paid`, `Partially Paid`, `Pending`, or `Overdue` with quick one-click payment settlement modals and batch status operations.

2. **Native Android Companion Application (`/android`)**
   - Built with **Kotlin**, **Jetpack Compose**, and **Material 3**.
   - Connects to the backend REST API on **port 8001**.
   - Field payment recording with partial/full balance auto-calculation.
   - Built-in connection testing, latency ping, and dynamic server IP switching (Emulator `10.0.2.2:8001`, Local LAN WiFi, or Caddy HTTPS domain).
   - In-app interactive simulator in the web dashboard for instant browser testing.

3. **Backend REST API (`server.js` on Port 8001)**
   - Persistent JSON store (`/data/database.json`) storing transactions, company branding, and user accounts.
   - CORS enabled for Android app and reverse proxy access.
   - Endpoints for auth, transactions, payments, company profile, and backups.

4. **Multi-Format Accounting Export**
   - **Excel (.xlsx)**: Formatted workbooks with automated column widths, currency values, grand total summary formulas, and client breakdown sheets.
   - **PDF Reports**: Clean landscape ledger tables and branded single **Statement of Account / Billing Invoices** with official signature blocks.
   - **Clean Currency Formatting**: Philippine Peso (`PHP ₱`) currency representation formatted without `+/-` or `±` encoding glitches in PDF viewers.

5. **Multi-Company Branding & Custom Logo**
   - Customize company name, tagline, business address, contact numbers, TIN, and authorized signatory details.
   - Upload custom PNG/JPEG company logos or select preset engineering icons and brand accent colors.

6. **Role-Based Access Control (RBAC) & Self-Nominated PINs**
   - **Admin**: Full administrative authority — manage transactions, edit company branding, manage user accounts, change roles, and perform backups/restores.
   - **Editor**: Operational authority — record new transactions, edit project scopes, update payment statuses, and export accounting reports.
   - **Viewer**: Read-only access — view the transaction ledger, browse weekly/monthly spending reports, and export documents.
   - **Self-Nominated PIN**: Secure 4–6 digit user-defined PIN for fast, frictionless authentication.

7. **Comprehensive Backup & Restore**
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

### 1. Docker Compose (Port 8001)

The application includes a `docker-compose.yml` configured to expose port **8001** (avoiding host database port 3304):

```bash
docker compose up -d --build
```

To view logs or stop the service:
```bash
docker compose logs -f
docker compose down
```

### 2. Standard Docker CLI

```bash
# 1. Build the production image
docker build -t ledgerpro:latest .

# 2. Run the container on port 8001
docker run -d \
  --name ledgerpro-app \
  -p 8001:8001 \
  --restart unless-stopped \
  ledgerpro:latest
```

---

## 🔒 Caddy Reverse Proxy Configuration

Add either of the following configurations to your `Caddyfile`:

### Scenario A: Caddy on the Host Machine
```caddy
ledger.yourdomain.com {
    reverse_proxy localhost:8001
}
```

### Scenario B: Caddy in a Docker Network
If Caddy and LedgerPro share a Docker network (e.g. `caddy_net`):
```caddy
ledger.yourdomain.com {
    reverse_proxy ledgerpro-app:8001
}
```

Caddy handles automatic HTTPS certificate issuance and renewal via Let's Encrypt / ZeroSSL.

---

## 📱 Android Application Setup (`/android`)

The Android application is located in the `android/` directory.

### Quick Start with Android Studio
1. Open Android Studio and choose **Open**, selecting the `android/` directory.
2. Gradle sync will resolve all dependencies (Jetpack Compose, Retrofit 2, OkHttp).
3. Connect your Android phone via USB (with Developer Mode & USB Debugging enabled) or start an Android Virtual Device (AVD).

### Connecting to the Backend
Inside the Android app:
- **In Emulator**: Set Server URL to `http://10.0.2.2:8001/api/`
- **On Physical Phone (WiFi)**: Set Server URL to `http://<YOUR_COMPUTER_IP>:8001/api/`
- **In Production**: Set Server URL to `https://ledger.yourdomain.com/api/`
- Tap **Test Connection & Ping API** to verify the green indicator.

### Building APK from Command Line
```bash
cd android
./gradlew assembleDebug
# Generated APK: android/app/build/outputs/apk/debug/app-debug.apk

# Install to connected device via ADB
adb install app/build/outputs/apk/debug/app-debug.apk
```

---

## 🌐 Backend REST API Reference (Port 8001)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Container health probe |
| `GET` | `/api/status` | API status, version, and statistics |
| `POST` | `/api/auth/login` | Authenticate with username & PIN |
| `GET` | `/api/transactions` | List project billings (`?status=&search=`) |
| `POST` | `/api/transactions` | Create new billing |
| `PUT` | `/api/transactions/:id` | Update transaction |
| `DELETE` | `/api/transactions/:id` | Delete transaction |
| `PATCH` | `/api/transactions/:id/payment` | Record payment in Philippine Peso |
| `GET` | `/api/company` | Get company branding profile |
| `PUT` | `/api/company` | Update company branding profile |
| `GET` | `/api/users` | List registered user profiles |
| `GET` | `/api/backup` | Download complete JSON backup |
| `POST` | `/api/restore` | Restore from JSON backup |

---

## 💾 Backup and Restore Procedures

### 1. Generating a Backup
1. Click the **Backup** button in the header (or navigate to the footer link).
2. Review the summary of active transactions, company profile, and user accounts.
3. Click **Download Backup (.json)**. The file will be named `ledgerpro-backup-YYYY-MM-DD.json`.
4. Store the file in your company's secure backup repository (e.g. encrypted cloud drive).

### 2. Restoring a Backup
1. Click the **Backup** button in the header.
2. Click **Select Backup File (.json)** and choose your previously exported `.json` file.
3. The modal displays a preview showing the number of transactions and company branding inside the backup file.
4. Choose your restore mode:
   - **Clean Replace**: Overwrites existing records with the backup dataset.
   - **Merge**: Appends new records while updating matching transaction IDs.
5. Confirm the action to restore the system state.
