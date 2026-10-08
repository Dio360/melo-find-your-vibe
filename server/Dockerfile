# MELO server — production image (Railway / Render / Fly)
# Build context: server/ directory
FROM node:24-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
COPY nest-cli.json tsconfig*.json ./
COPY src ./src
RUN npx prisma generate && npm run build

FROM node:24-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
EXPOSE 3001
# Railway/Render inject PORT; Nest reads process.env.PORT with 3001 fallback.
# migrate deploy keeps Postgres in sync; trgm enable is idempotent (|| true).
CMD ["sh", "-c", "npx prisma migrate deploy && node prisma/enable-trgm.mjs || true; node dist/main"]
