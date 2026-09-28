# syntax=docker/dockerfile:1

FROM node:22-alpine AS app

WORKDIR /app

COPY package.json bun.lock ./
RUN npm install

COPY . .

RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["npm", "start"]
