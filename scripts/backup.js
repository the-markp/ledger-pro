#!/usr/bin/env node

/**
 * LedgerPro Automated Daily Backup & Retention Manager
 * 
 * Features:
 * - Creates a comprehensive JSON backup of transactions, users, and company branding.
 * - Enforces retention: Automatically keeps only the 10 most recent backups.
 * - Resilient: Tries HTTP REST API first; falls back to direct database query if server is offline.
 * - Modes: One-shot execution (default) or background daemon mode (--daemon / --daily).
 * 
 * Usage:
 *   node scripts/backup.js                 # Run single backup now
 *   node scripts/backup.js --max 10        # Retain specific number (default: 10)
 *   node scripts/backup.js --daemon        # Run continuously every 24 hours
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Configuration
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(ROOT_DIR, 'backups');
const MAX_BACKUPS = parseInt(process.env.MAX_BACKUPS || '10', 10);
const PORT = process.env.PORT || '8001';
const HOST = process.env.HOST || '127.0.0.1';

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function getFormattedTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const mins = pad(d.getMinutes());
  const secs = pad(d.getSeconds());
  return `${year}-${month}-${day}_${hours}${mins}${secs}`;
}

// Fetch backup from running server via HTTP
function fetchHttpBackup(port) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      port: Number(port),
      path: '/api/backup',
      method: 'GET',
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (e) {
            reject(new Error('Invalid JSON received from server'));
          }
        } else {
          reject(new Error(`Server returned status code ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
    req.end();
  });
}

// Direct database fallback if HTTP server is not reachable
async function fetchDirectDbBackup() {
  const { db } = await import(path.join(ROOT_DIR, 'server', 'db.js'));
  await db.init();
  return await db.getBackup();
}

// Prune directory to retain only the N most recent backups
function enforceRetention(dir, maxCount) {
  try {
    const files = fs.readdirSync(dir)
      .filter((f) => f.startsWith('ledgerpro_backup_') && f.endsWith('.json'))
      .map((f) => {
        const filePath = path.join(dir, f);
        const stats = fs.statSync(filePath);
        return { name: f, path: filePath, mtime: stats.mtime.getTime() };
      });

    // Sort descending by modification time (newest first)
    files.sort((a, b) => b.mtime - a.mtime);

    console.log(`📁 Total existing backups: ${files.length} (Retention limit: ${maxCount})`);

    if (files.length > maxCount) {
      const filesToRemove = files.slice(maxCount);
      console.log(`🧹 Pruning ${filesToRemove.length} older backup(s)...`);

      for (const file of filesToRemove) {
        fs.unlinkSync(file.path);
        console.log(`   ❌ Removed old backup: ${file.name}`);
      }
    }

    const remaining = fs.readdirSync(dir).filter((f) => f.startsWith('ledgerpro_backup_') && f.endsWith('.json'));
    console.log(`✅ Active backups retained: ${remaining.length}/${maxCount}`);
  } catch (err) {
    console.error('⚠️ Error during retention enforcement:', err.message);
  }
}

export async function performBackup() {
  const timestamp = getFormattedTimestamp();
  const filename = `ledgerpro_backup_${timestamp}.json`;
  const filePath = path.join(BACKUP_DIR, filename);

  console.log(`\n==================================================`);
  console.log(`📦 LedgerPro Automated Backup Engine`);
  console.log(`🕒 Timestamp: ${new Date().toISOString()}`);
  console.log(`📂 Destination: ${filePath}`);
  console.log(`==================================================`);

  let backupData = null;

  // 1. Try port 8001 (Production/Docker port)
  try {
    console.log(`📡 Fetching backup from server at http://${HOST}:${PORT}/api/backup...`);
    backupData = await fetchHttpBackup(PORT);
  } catch (err1) {
    // 2. Try port 3000 (Development port)
    if (PORT !== '3000') {
      try {
        console.log(`📡 Trying dev port 3000 at http://${HOST}:3000/api/backup...`);
        backupData = await fetchHttpBackup('3000');
      } catch (err2) {
        // Fall back to direct database query
      }
    }
  }

  // 3. Fallback to direct DB extraction if HTTP was not available
  if (!backupData) {
    console.log(`💾 Server HTTP offline. Falling back to direct database extraction...`);
    try {
      backupData = await fetchDirectDbBackup();
    } catch (err3) {
      console.error(`❌ Failed direct DB extraction:`, err3.message);
      // 4. Fallback to raw copy of data/database.json if present
      const rawDbPath = path.join(ROOT_DIR, 'data', 'database.json');
      if (fs.existsSync(rawDbPath)) {
        console.log(`📂 Reading local database.json file...`);
        const content = fs.readFileSync(rawDbPath, 'utf8');
        backupData = JSON.parse(content);
      } else {
        throw new Error('Unable to extract backup: both server API and local database files are unavailable.');
      }
    }
  }

  // Write snapshot to disk
  const jsonContent = JSON.stringify(backupData, null, 2);
  fs.writeFileSync(filePath, jsonContent, 'utf8');

  const stats = fs.statSync(filePath);
  const sizeKb = (stats.size / 1024).toFixed(2);

  const txCount = Array.isArray(backupData.transactions) ? backupData.transactions.length : 0;
  const userCount = Array.isArray(backupData.users) ? backupData.users.length : 0;
  const companyName = backupData.companyProfile?.companyName || 'Default Company';

  console.log(`✅ Backup successfully saved!`);
  console.log(`   - File: ${filename}`);
  console.log(`   - Size: ${sizeKb} KB`);
  console.log(`   - Transactions: ${txCount} record(s)`);
  console.log(`   - Users: ${userCount} account(s)`);
  console.log(`   - Company: ${companyName}`);

  // Enforce retention policy: keep only the 10 most recent backups
  enforceRetention(BACKUP_DIR, MAX_BACKUPS);

  return {
    success: true,
    filename,
    filePath,
    sizeKb,
    txCount,
    userCount
  };
}

// Check if script is executed directly via CLI
const isDirectCliExecution = process.argv[1] && (
  process.argv[1] === fileURLToPath(import.meta.url) ||
  process.argv[1].endsWith('scripts/backup.js') ||
  process.argv[1].endsWith('scripts/backup')
);

if (isDirectCliExecution) {
  const args = process.argv.slice(2);
  const isDaemon = args.includes('--daemon') || args.includes('--daily');

  if (isDaemon) {
    console.log(`🕒 Starting LedgerPro Daily Backup Daemon...`);
    console.log(`🔁 Will run every 24 hours. Retention limit: ${MAX_BACKUPS} backups.`);

    // Perform initial backup immediately
    performBackup().catch((e) => console.error('Initial backup error:', e.message));

    // Schedule every 24 hours (86,400,000 ms)
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    setInterval(() => {
      performBackup().catch((e) => console.error('Daily automated backup error:', e.message));
    }, TWENTY_FOUR_HOURS);
  } else {
    // Execute single run
    performBackup()
      .then(() => process.exit(0))
      .catch((err) => {
        console.error(`\n❌ Backup failed:`, err.message);
        process.exit(1);
      });
  }
}
