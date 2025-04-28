# Builder stage
FROM node:22-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:22-slim

WORKDIR /app

# Copy the standalone output and node_modules from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next/standalone ./standalone
COPY --from=builder /app/.next/static ./standalone/.next/static

# Set the working directory to the standalone directory
WORKDIR /app/standalone

ENV NODE_ENV production
EXPOSE 3000
CMD ["node", "server.js"]
