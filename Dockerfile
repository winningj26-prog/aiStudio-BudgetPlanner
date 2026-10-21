# syntax=docker/dockerfile:1

FROM node:22-alpine

WORKDIR /app

COPY package.json bun.lock ./
RUN npm install

COPY --chown=node:node . .

# Render exposes service environment variables to Docker builds as build args.
# Vite replaces VITE_* values at build time, so declare the public Supabase
# configuration here before running the frontend build.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY

RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080

USER node

EXPOSE 8080

CMD ["npm", "start"]
