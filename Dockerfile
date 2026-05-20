# =========================================================
# Project Lumina: High-Stakes Academy Container Framework
# Optimized Multi-Stage Dockerfile for Google Cloud Run
# =========================================================

# Stage 1: Dependency Assembly & Production Compilation Blueprint
FROM node:20-slim AS builder

WORKDIR /app

# System dependencies for engine compilation (openssl is vital for Prisma TLS handshakes)
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Fetch core package descriptors
COPY package*.json ./

# Fresh package sync
RUN npm ci

# Sync all remaining workspace resources
COPY . .

# Compile Prisma Client definitions
RUN npx prisma generate

# Execute build pipelines (Vite client assets compiling & esbuild bundling server.ts into dist/server.cjs)
RUN NODE_ENV=production npm run build


# Stage 2: Optimized Lightweight Execution Blueprint
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Ensure runtime openssl is active for database channels
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Extract necessary built binaries and dependencies from builder blueprint
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json

# Standalone port exposure matching the reverse proxy configuration
EXPOSE 3000

# Run entry mapping to standard production runner (start maps to: node dist/server.cjs)
CMD ["npm", "run", "start"]
