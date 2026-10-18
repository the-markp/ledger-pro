# ==============================================================================
# Multi-stage Dockerfile for LedgerPro Engineering Billing & Reporting Platform
# ==============================================================================

# Stage 1: Build the React + Vite frontend and prepare production dependencies
FROM node:20-alpine AS builder
WORKDIR /app

# Configure npm for resilient network downloads with retries
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

# Copy package descriptors
COPY package*.json ./

# Install all dependencies (including devDependencies required for vite build)
RUN npm install --legacy-peer-deps

# Copy application source code
COPY . .

# Build production bundle to /app/dist
RUN npm run build

# Prune devDependencies in builder so node_modules only contains production dependencies
RUN npm prune --omit=dev && npm cache clean --force

# ==============================================================================
# Stage 2: Production runtime environment
# ==============================================================================
FROM node:20-alpine AS runner
WORKDIR /app

# Expose on port 8001 (isolated from host database on port 3304)
ENV NODE_ENV=production \
    PORT=8001 \
    HOST=0.0.0.0

# Install wget for container health checks
RUN apk add --no-cache wget

# Create unprivileged application user for security hardening
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy package files
COPY package*.json ./

# Copy prepared production node_modules from builder (avoids redundant network install)
COPY --from=builder /app/node_modules ./node_modules

# Copy built frontend assets from builder stage
COPY --from=builder /app/dist ./dist

# Copy backend files and server entrypoint
COPY server.js ./
COPY server ./server

# Create data directory for JSON persistence with proper permissions
RUN mkdir -p /app/data && chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose container port 8001
EXPOSE 8001

# Container healthcheck on port 8001
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8001/health || exit 1

# Start the Express server
CMD ["node", "server.js"]
