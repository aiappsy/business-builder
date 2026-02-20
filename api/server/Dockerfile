# Use Node.js 20 slim as base image
FROM node:20-slim AS builder

# Create app directory
WORKDIR /app

# Install dependencies for the API server specifically
# Note: We assume the build context is the root of the monorepo
COPY api/server/package*.json ./
RUN npm install

# Bundle app source from the API server subdirectory
COPY api/server/ .

# Build TypeScript
RUN npm run build

# Production Stage
FROM node:20-slim
WORKDIR /app

# Copy built assets and production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install only production dependencies
RUN npm install --production

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose the API port
EXPOSE 8080

# Command to run the app
CMD ["npm", "start"]
