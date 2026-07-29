FROM node:24-slim

# native deps for better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (layer cache)
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/poker-engine/package.json ./packages/poker-engine/
COPY packages/server/package.json ./packages/server/

RUN npm ci

# Copy source
COPY packages/shared ./packages/shared
COPY packages/poker-engine ./packages/poker-engine
COPY packages/server ./packages/server

RUN mkdir -p /app/data && chown -R node:node /app

USER node

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV DB_PATH=/app/data/cpcdigital.db

EXPOSE 3001

CMD ["node", "--import", "tsx/esm", "packages/server/src/index.ts"]
