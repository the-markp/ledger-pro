# ==============================================================================
# Multi-stage Dockerfile for LedgerPro Engineering Billing & Reporting Platform
# ==============================================================================

# Stage 1: Build the React + Vite frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install all dependencies (including devDependencies required for vite build)
RUN npm install

# Copy application source code
COPY . .

# Build production bundle to /app/dist
RUN npm run build

# ==============================================================================
# Stage 2: Production runtime environment
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

# Install curl / wget for health checks
RUN apk add --no-cache wget

# Create unprivileged application user for security hardening
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy built frontend assets from builder stage
COPY --from=builder /app/dist ./dist

# Copy server entrypoint
COPY server.js ./

# Set ownership to unprivileged user
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose container port
EXPOSE 3000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1

# Start the Express server
CMD ["node", "server.js"]
