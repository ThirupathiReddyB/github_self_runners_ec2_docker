# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm i

COPY . .
RUN ls -la


RUN npx prisma generate

ENV NODE_OPTIONS="--max-old-space-size=1536"
RUN npm run build

RUN npm prune --omit=dev


# Runtime Stage
FROM node:20-alpine

WORKDIR /app

#COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
#COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/.env ./dist/.env

USER node

EXPOSE 3000

CMD ["node", "dist/src/index.js"]
