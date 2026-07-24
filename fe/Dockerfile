# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS builder
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY tsconfig.json next.config.mjs postcss.config.mjs ./
COPY public ./public
COPY src ./src

RUN --mount=type=secret,id=frontend_env,target=/usr/src/app/.env,required=true \
    npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3020
# Giờ Việt Nam — container mặc định UTC sẽ làm lệch timestamp 7 tiếng.
ENV TZ=Asia/Ho_Chi_Minh

COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY --from=builder --chown=node:node /usr/src/app/.next ./.next
COPY --from=builder --chown=node:node /usr/src/app/public ./public
# next start đọc config lúc runtime (images.remotePatterns cho Cloudinary/Goong...).
COPY --from=builder --chown=node:node /usr/src/app/next.config.mjs ./next.config.mjs

USER node
EXPOSE 3020
CMD ["npm", "start"]
