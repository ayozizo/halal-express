# Railway-friendly backend (JavaScript) with static HTML admin panel

FROM node:20-alpine

WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

ENV NODE_ENV=production
ENV PRISMA_HIDE_UPDATE_MESSAGE=1

COPY backend/prisma ./prisma
COPY backend/src ./src
COPY backend/public ./public

RUN npx prisma generate

EXPOSE 8080

CMD if [ -n "$DATABASE_PUBLIC_URL" ]; then case "$DATABASE_PUBLIC_URL" in *sslmode=*) export DATABASE_URL="$DATABASE_PUBLIC_URL" ;; *\?*) export DATABASE_URL="$DATABASE_PUBLIC_URL&sslmode=require" ;; *) export DATABASE_URL="$DATABASE_PUBLIC_URL?sslmode=require" ;; esac; fi; i=0; until npx prisma migrate deploy; do i=$((i+1)); if [ $i -ge 12 ]; then echo 'Prisma migrate failed after retries' >&2; exit 1; fi; echo 'Prisma migrate failed (likely DB not ready). Retrying...' >&2; sleep 3; done; node src/index.js
