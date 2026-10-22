# ---- Etapa de build ----
FROM node:22-slim AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# prisma.config.ts exige DATABASE_URL/DIRECT_URL para cargar, aunque
# `generate` no abra una conexión real. Valores falsos solo para este paso.
RUN DATABASE_URL="postgresql://user:pass@localhost:5432/dummy" \
    DIRECT_URL="postgresql://user:pass@localhost:5432/dummy" \
    npx prisma generate

RUN pnpm run build

# ---- Etapa final ----
FROM node:22-slim AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=build /app/dist ./dist

USER node
EXPOSE 8080

CMD ["node", "dist/main.js"]
