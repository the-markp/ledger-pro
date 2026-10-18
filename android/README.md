# LedgerPro Android Application

A modern, native Android companion application built with **Kotlin**, **Jetpack Compose**, and **Material 3**, designed for on-the-go engineering project billing, payment tracking in Philippine Peso (₱), and real-time synchronization with the LedgerPro backend.

---

## 📱 Features

- **Philippine Peso (₱) Native Billing**: Real-time totals for Billed, Collected, Receivables, and Overdue accounts.
- **Field Payment Recording**: Record partial or full payments directly on-site (Bank Transfer, GCash/Maya, Check, Cash) with instant balance recalculation.
- **Role-Based Access Control**:
  - **Admin**: Full authority to create, edit, record payments, and manage accounts.
  - **Editor**: Record project billings and update client payments.
  - **Viewer**: Read-only access to statements and financial summaries.
- **Dynamic Backend Server Configuration**:
  - Connect to local development (`http://10.0.2.2:8001/api/` in Android Emulator)
  - Connect to local LAN / WiFi IP (`http://192.168.1.xxx:8001/api/`)
  - Connect to your production Caddy reverse proxy (`https://ledger.yourdomain.com/api/`)
  - Built-in live Ping & Connection test with status badges.
- **Offline Resilient**: Local state caching allows uninterrupted field viewing even in low-signal job sites.

---

## 🚀 Getting Started

### Prerequisites

- **Android Studio** Hedgehog (2023.1.1) or newer
- **Android SDK** API 35 (compileSdk 35, minSdk 26 - Android 8.0+)
- **JDK 17** (bundled with modern Android Studio)

### Opening the Project

1. Launch Android Studio.
2. Select **Open** and choose the `android/` directory inside this repository.
3. Allow Gradle to sync dependencies (Retrofit 2.11, OkHttp 4.12, Compose BOM 2024.12, Material 3).

---

## 🌐 Connecting to the Backend

The LedgerPro backend runs on port **8001** (or proxied via Caddy).

### 1. Android Emulator (AVD)
The Android Emulator uses `10.0.2.2` to refer to the host computer's `localhost`:
```text
http://10.0.2.2:8001/api/
```

### 2. Physical Android Phone (Same WiFi Network)
Find your computer's local IP address (`ipconfig` on Windows or `ip a` / `ifconfig` on Linux/macOS):
```text
http://192.168.1.50:8001/api/
```
Ensure your host firewall permits incoming connections on port `8001`.

### 3. Production Deployment with Caddy Reverse Proxy
If deployed behind Caddy with SSL:
```text
https://ledgerpro.yourdomain.com/api/
```

Inside the Android app:
1. Tap the **Settings** (⚙️) icon on the login screen.
2. Enter your server URL or tap one of the quick presets.
3. Tap **Test Connection & Ping API** to verify connectivity.
4. Tap **Save and Return**.

---

## 🛠️ Building the APK

You can build the debug APK using Gradle:

```bash
# On Linux / macOS
cd android
./gradlew assembleDebug

# On Windows
cd android
gradlew.bat assembleDebug
```

The compiled APK will be generated at:
```text
android/app/build/outputs/apk/debug/app-debug.apk
```

To install directly onto a connected Android phone via ADB:
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🔐 Default Credentials (PIN Authentication)

| Role | Username | Default PIN | Permissions |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `1234` | Full Read / Write / Payment / Server config |
| **Editor** | `editor` | `1234` | Create billings, record payments, view reports |
| **Auditor / Viewer** | `viewer` | `1234` | Read-only ledger view |
