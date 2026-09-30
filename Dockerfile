# syntax=docker/dockerfile:1

FROM node:22-alpine

WORKDIR /app

COPY package.json bun.lock ./
RUN npm install

COPY --chown=node:node . .

RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080

USER node

EXPOSE 8080

CMD ["npm", "start"]
