# Use a Node.js base image.  Choose a version compatible with your project.
FROM node:22-alpine as builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN npm run build


# Production image based on a smaller base image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy only the necessary files from the builder stage.
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Expose the port Next.js uses (default is 3000)
EXPOSE 3000

# Start the Next.js server.  This is crucial for Cloud Run.
CMD ["npm", "start"]
