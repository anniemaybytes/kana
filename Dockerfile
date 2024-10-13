FROM node:20-alpine AS base
WORKDIR /app

FROM base AS builder
COPY package.json .
COPY yarn.lock .
RUN yarn --frozen-lockfile --non-interactive
COPY . .
RUN yarn build && mv yarnclean .yarnclean && yarn --frozen-lockfile --non-interactive --production

FROM base AS release
ENV NODE_ENV production
COPY --from=builder --chown=1000:1000 /app/node_modules ./node_modules
COPY --from=builder --chown=1000:1000 /app/package.json .
COPY --from=builder --chown=1000:1000 /app/dist ./dist
USER 1000:1000
CMD [ "node", "dist/index.js" ]
