# Builds apps/api only — apps/web is a static build, deployed separately to
# Cloudflare Pages (see deploy/README.md), not containerized.
#
# Uses Debian-slim (not Alpine) deliberately: Prisma's musl/OpenSSL engine
# detection on Alpine hit a real runtime mismatch when this was tried
# (worked at build time, failed at container runtime with a
# libssl.so.1.1-not-found error even with the right binaryTargets listed)
# — Debian-slim avoids that whole class of issue and is the combination
# Prisma's own docs steer you toward for exactly this reason.
#
# Build from the REPO ROOT (npm workspaces need the root package.json +
# package-lock.json alongside apps/api's):
#   docker build -t sr-home-tutors-api -f Dockerfile .

FROM node:20-slim AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
# Installs both workspaces (a single shared package-lock.json covers them
# both) — simpler and more reliable than trying to filter to one workspace,
# at the cost of a slightly larger deps layer.
RUN npm ci

FROM node:20-slim AS build
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps/api ./apps/api
RUN npm run prisma:generate --workspace=apps/api
RUN npm run build --workspace=apps/api

FROM node:20-slim AS runtime
WORKDIR /repo
ENV NODE_ENV=production
# Prisma's query engine needs libssl at runtime — Debian-slim doesn't
# include it by default.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
RUN groupadd -r app && useradd -r -g app app
# From the BUILD stage, not deps — `prisma generate` wrote the generated
# client into node_modules/@prisma/client + node_modules/.prisma/client
# there; the deps stage's node_modules never got that step run against it.
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/prisma ./apps/api/prisma
COPY apps/api/package.json ./apps/api/package.json
WORKDIR /repo/apps/api
USER app
EXPOSE 4000
CMD ["node", "dist/server.js"]
