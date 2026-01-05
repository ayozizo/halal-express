# Railway-friendly backend (JavaScript) with static HTML admin panel

FROM node:20-alpine

WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json* ./
RUN npm ci || npm install

ENV NODE_ENV=production

COPY backend/prisma ./prisma
COPY backend/src ./src
COPY backend/public ./public

RUN npx prisma generate

EXPOSE 8080

CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
