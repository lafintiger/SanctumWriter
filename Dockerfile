# SanctumWriter Docker Image
# Multi-stage build for optimized production image

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set Next.js to output standalone
ENV NEXT_TELEMETRY_DISABLED 1

# Build the application
RUN npm run build

# ============================================
# Stage 3: Runner (Production)
# ============================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Install Python for document conversion
RUN apk add --no-cache python3 py3-pip

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Python scripts and requirements
COPY scripts ./scripts
COPY requirements.txt ./

# Install Python dependencies (with virtual env to avoid conflicts)
RUN python3 -m venv /app/venv && \
    /app/venv/bin/pip install --no-cache-dir -r requirements.txt || true

# Create documents directory for workspace
RUN mkdir -p /app/documents && chown -R nextjs:nodejs /app/documents

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

# Expose the port
EXPOSE 3125

ENV PORT 3125
ENV HOSTNAME "0.0.0.0"

# Default environment variables
ENV WORKSPACE_PATH=/app/documents
ENV OLLAMA_URL=http://host.docker.internal:11434
ENV DEFAULT_PROVIDER=ollama
ENV DEFAULT_MODEL=llama3

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3125/ || exit 1

CMD ["node", "server.js"]



