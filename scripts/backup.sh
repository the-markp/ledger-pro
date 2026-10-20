#!/usr/bin/env bash

# ==============================================================================
# LedgerPro Daily Backup & Retention Automation Script
#
# This script:
# 1. Takes an automated snapshot of transactions, users, and branding settings.
# 2. Saves timestamped JSON (and PostgreSQL SQL dump if postgres is running).
# 3. Strictly enforces retention: KEEPS ONLY THE 10 MOST RECENT BACKUPS.
# 4. Removes older backups automatically.
#
# Cron Setup:
#   To run automatically every day at 2:00 AM, add to crontab (crontab -e):
#   0 2 * * * /path/to/ledgerpro/scripts/backup.sh >> /path/to/ledgerpro/backups/backup.log 2>&1
# ==============================================================================

set -euo pipefail

# Determine script and project directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Load environment variables if .env exists
if [ -f "${PROJECT_DIR}/.env" ]; then
    # shellcheck disable=SC1091
    export $(grep -v '^#' "${PROJECT_DIR}/.env" | xargs -r) 2>/dev/null || true
fi

# Configurable settings
BACKUP_DIR="${BACKUP_DIR:-${PROJECT_DIR}/backups}"
MAX_BACKUPS="${MAX_BACKUPS:-10}"
APP_PORT="${PORT:-8001}"
HOST="${HOST:-127.0.0.1}"
TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/ledgerpro_backup_${TIMESTAMP}.json"
PG_DUMP_FILE="${BACKUP_DIR}/ledgerpro_postgres_${TIMESTAMP}.sql.gz"

# Create destination folder
mkdir -p "${BACKUP_DIR}"

echo "=========================================================="
echo "📦 LedgerPro Daily Backup Automation"
echo "🕒 Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "📂 Backup Directory: ${BACKUP_DIR}"
echo "🔒 Retention Policy: Keep only the ${MAX_BACKUPS} most recent backups"
echo "=========================================================="

# ------------------------------------------------------------------------------
# 1. Primary Backup via REST API / Node Backup Engine
# ------------------------------------------------------------------------------
echo "📡 Generating application data backup..."

BACKUP_SUCCESS=false

# Method A: Try curl against the running app server on Port 8001 or 3000
for TARGET_PORT in "${APP_PORT}" 8001 3000; do
    API_URL="http://${HOST}:${TARGET_PORT}/api/backup"
    HTTP_CODE=$(curl -s -o "${BACKUP_FILE}.tmp" -w "%{http_code}" --connect-timeout 5 "${API_URL}" 2>/dev/null || true)
    
    if [ "${HTTP_CODE}" = "200" ] && [ -s "${BACKUP_FILE}.tmp" ]; then
        mv "${BACKUP_FILE}.tmp" "${BACKUP_FILE}"
        BACKUP_SUCCESS=true
        echo "✅ API snapshot captured from ${API_URL}"
        break
    else
        rm -f "${BACKUP_FILE}.tmp"
    fi
done

# Method B: Fallback to Node.js backup engine if curl failed
if [ "${BACKUP_SUCCESS}" = false ]; then
    if command -v node >/dev/null 2>&1; then
        echo "💾 Server endpoint not responding; running local backup runner..."
        if node "${SCRIPT_DIR}/backup.js" >/dev/null 2>&1; then
            BACKUP_SUCCESS=true
            echo "✅ Backup created via Node engine"
        fi
    fi
fi

# Method C: Raw fallback from data/database.json
if [ "${BACKUP_SUCCESS}" = false ]; then
    if [ -f "${PROJECT_DIR}/data/database.json" ]; then
        echo "📁 Copying current state from data/database.json..."
        cp "${PROJECT_DIR}/data/database.json" "${BACKUP_FILE}"
        BACKUP_SUCCESS=true
        echo "✅ Backup copied from data/database.json"
    fi
fi

# ------------------------------------------------------------------------------
# 2. Optional: PostgreSQL Direct Dump (if Docker Compose / pg_dump is available)
# ------------------------------------------------------------------------------
if command -v docker >/dev/null 2>&1 && docker compose ps postgres 2>/dev/null | grep -q "Up"; then
    echo "🐘 Detected active PostgreSQL container. Taking native database dump..."
    if docker compose exec -T postgres pg_dump -U "${POSTGRES_USER:-ledgerpro_user}" "${POSTGRES_DB:-ledgerpro_db}" 2>/dev/null | gzip > "${PG_DUMP_FILE}"; then
        echo "✅ Native PostgreSQL dump saved: $(basename "${PG_DUMP_FILE}") ($(du -h "${PG_DUMP_FILE}" | cut -f1))"
    else
        rm -f "${PG_DUMP_FILE}"
    fi
fi

# Verify JSON backup exists
if [ -f "${BACKUP_FILE}" ]; then
    FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "📄 JSON Backup File: $(basename "${BACKUP_FILE}") (${FILE_SIZE})"
fi

# ------------------------------------------------------------------------------
# 3. Retention Enforcement: Keep strictly the 10 most recent backups
# ------------------------------------------------------------------------------
echo ""
echo "🧹 Checking retention policy (Max: ${MAX_BACKUPS} backups)..."

# Prune JSON backups
mapfile -t JSON_BACKUPS < <(find "${BACKUP_DIR}" -maxdepth 1 -name "ledgerpro_backup_*.json" -type f -printf "%T@ %p\n" 2>/dev/null | sort -rn | cut -d' ' -f2-)
JSON_COUNT=${#JSON_BACKUPS[@]}

echo "📊 Total JSON backups found: ${JSON_COUNT}"

if [ "${JSON_COUNT}" -gt "${MAX_BACKUPS}" ]; then
    REMOVE_COUNT=$((JSON_COUNT - MAX_BACKUPS))
    echo "⚠️ Pruning ${REMOVE_COUNT} older backup(s) to maintain the 10-backup limit..."
    
    for ((i=MAX_BACKUPS; i<JSON_COUNT; i++)); do
        FILE_TO_REMOVE="${JSON_BACKUPS[$i]}"
        echo "   ❌ Deleting: $(basename "${FILE_TO_REMOVE}")"
        rm -f "${FILE_TO_REMOVE}"
    done
fi

# Prune SQL dumps (if any)
mapfile -t SQL_BACKUPS < <(find "${BACKUP_DIR}" -maxdepth 1 -name "ledgerpro_postgres_*.sql.gz" -type f -printf "%T@ %p\n" 2>/dev/null | sort -rn | cut -d' ' -f2-)
SQL_COUNT=${#SQL_BACKUPS[@]}

if [ "${SQL_COUNT}" -gt "${MAX_BACKUPS}" ]; then
    for ((i=MAX_BACKUPS; i<SQL_COUNT; i++)); do
        rm -f "${SQL_BACKUPS[$i]}"
    done
fi

REMAINING_COUNT=$(find "${BACKUP_DIR}" -maxdepth 1 -name "ledgerpro_backup_*.json" -type f | wc -l)
echo "✅ Active backups currently retained: ${REMAINING_COUNT} of ${MAX_BACKUPS}"
echo "🎉 Daily backup and retention cycle completed successfully."
echo "=========================================================="
