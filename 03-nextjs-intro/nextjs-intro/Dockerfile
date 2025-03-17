# --- Builder Stage ---
FROM node:22-alpine as builder

WORKDIR /app

COPY package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm install

COPY . .

# Build the Next.js application in standalone mode
RUN npm run build

# --- Production Stage ---
FROM node:22-alpine

WORKDIR /app

# Copy the standalone output and public folder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

# Copy package.json for production
COPY --from=builder /app/package.json ./package.json

# Install only production dependencies
RUN npm install --production --ignore-scripts

# Expose the port
EXPOSE 3000

# Start the standalone server
CMD ["node", "server.js"]
