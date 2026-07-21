FROM node:20-bookworm-slim AS builder
WORKDIR /usr/src/app

RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*


RUN npm i -g npm@11

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY tsconfig*.json nest-cli.json ./
COPY src ./src

RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production
# Mặc định khớp với port publish/healthcheck trong docker-compose; env_file hoặc
# environment vẫn ghi đè được khi cần.
ENV PORT=5000
ENV TZ=Asia/Ho_Chi_Minh


RUN npm i -g npm@11

COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY --from=builder --chown=node:node /usr/src/app/dist ./dist

USER node
EXPOSE 5000
CMD ["node", "dist/main"]
