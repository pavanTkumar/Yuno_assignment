# Frontend — Next.js 16 (Node 22, pnpm, standalone output)
FROM node:22-slim AS builder

# Pin pnpm 10 (matches the committed lockfile; pnpm 11 hard-fails on
# un-approved dependency build scripts in non-interactive mode).
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
# Network-resilient install (Colima's NAT can drop pnpm's many parallel
# connections — raise retries/timeouts, cap concurrency).
RUN pnpm config set fetch-retries 5 \
 && pnpm config set fetch-retry-maxtimeout 120000 \
 && pnpm config set network-concurrency 4 \
 && pnpm install --frozen-lockfile

COPY . .
# Baked at build time; overridable via compose for the browser bundle.
ARG NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
RUN pnpm build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
