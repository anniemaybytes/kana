FROM node:22-slim AS base
WORKDIR /app
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && \
    apt-get install --no-install-recommends -y ca-certificates && \
    rm -rf /var/lib/apt/lists/*

FROM base AS builder
RUN corepack enable
COPY package.json .
COPY pnpm-lock.yaml .
COPY pnpm-workspace.yaml .
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && pnpm prune --prod

FROM base AS release
ENV NODE_ENV production
COPY --from=builder --chown=1000:1000 /app/node_modules ./node_modules
COPY --from=builder --chown=1000:1000 /app/package.json .
COPY --from=builder --chown=1000:1000 /app/dist ./dist
USER 1000:1000
CMD [ "node", "dist/index.js" ]
