# syntax=docker/dockerfile:1

# ---- shared build: install once, build both apps from the Nx workspace ----
FROM node:22-alpine AS build
WORKDIR /workspace
ENV NX_DAEMON=false
RUN npm install -g pnpm@10

# Install deps first so this layer is cached unless the lockfile changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm nx run-many -t build --projects=website,admin --configuration=production

# ---- website: SSR, runs as a self-contained Node server ----
FROM node:22-alpine AS website
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
# Angular 21 SSR validates the Host header; list the hosts the server answers on.
ENV NG_ALLOWED_HOSTS=localhost
# server.mjs resolves ../browser relative to itself, so keep the dist layout intact.
COPY --from=build /workspace/dist/apps/website ./dist/apps/website
EXPOSE 4000
CMD ["node", "dist/apps/website/server/server.mjs"]

# ---- admin: static SPA served by nginx with history-API fallback ----
FROM nginx:alpine AS admin
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/dist/apps/admin/browser /usr/share/nginx/html
EXPOSE 80
