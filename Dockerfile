## Multi-stage Dockerfile: build the Vite app then run with a lightweight Node image
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies (including dev deps needed for the build)
COPY package.json package-lock.json ./
RUN npm ci --silent

# Copy sources and build
COPY . .
RUN npm run build

# Runtime image: only prod dependencies + built assets
FROM node:22-alpine AS runtime
WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --silent

# Copy built assets and server
COPY --from=build /app/dist ./dist
COPY server.js ./
COPY public ./public

EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "server.js"]
