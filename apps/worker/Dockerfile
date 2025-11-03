# syntax=docker/dockerfile:1.4

FROM node:20-bullseye AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx tsc apps/worker/src/index.ts \
  --module commonjs \
  --target es2020 \
  --rootDir apps/worker/src \
  --outDir apps/worker/dist \
  --esModuleInterop \
  --skipLibCheck

FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=4000
WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist

EXPOSE 4000

CMD ["node", "apps/worker/dist/index.js"]
