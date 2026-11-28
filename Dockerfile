# Multi-stage Dockerfile for AV-Raffle Web Application
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
# Enable corepack and activate pnpm
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /app

# Dual-fallback dependency installation:
# Prefer pnpm-lock.yaml when present; seamlessly fall back to package-lock.json (npm ci) if reverted
COPY web/package.json web/pnpm-lock.yaml* web/package-lock.json* ./
RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi

# Builder stage
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY web/ ./

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js using whichever tool is active
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN if [ -f pnpm-lock.yaml ]; then pnpm run build; else npm run build; fi

# Production Runner stage
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache su-exec

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:/app/data/raffle.db"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set up persistent directories
RUN mkdir -p /app/data /app/prisma /app/public/uploads /app/public/downloads && \
    chown -R nextjs:nodejs /app

COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy start script
RUN echo '#!/bin/sh' > /app/entrypoint.sh && \
    echo 'mkdir -p /app/data /app/public/uploads /app/public/downloads' >> /app/entrypoint.sh && \
    echo 'chown -R nextjs:nodejs /app/data /app/public/uploads /app/public/downloads' >> /app/entrypoint.sh && \
    echo 'chmod -R 775 /app/data /app/public/uploads /app/public/downloads' >> /app/entrypoint.sh && \
    echo 'su-exec nextjs npx prisma db push --skip-generate' >> /app/entrypoint.sh && \
    echo 'su-exec nextjs node scripts/seed-users.js || true' >> /app/entrypoint.sh && \
    echo 'exec su-exec nextjs npx next start' >> /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh && \
    chown root:root /app/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/app/entrypoint.sh"]
