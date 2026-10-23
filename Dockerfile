# Multi-stage build for HTR Dashboard
# Optimized for production deployment with minimal attack surface

# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production=false --ignore-scripts

# Copy source code
COPY . .

# Build application
ENV NODE_ENV=production
RUN npm run build:prod

# Production stage
FROM nginx:alpine AS production

# Install security updates
RUN apk upgrade --no-cache && \
    apk add --no-cache \
    curl \
    ca-certificates

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create necessary directories
RUN mkdir -p /var/cache/nginx /var/log/nginx && \
    chown -R nodejs:nodejs /var/cache/nginx /var/log/nginx /usr/share/nginx/html

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# Labels for container metadata
LABEL maintainer="HTR Team" \
      version="1.0.0" \
      description="HTR Dashboard - Production Ready React Application" \
      org.opencontainers.image.source="https://github.com/aidenpinto/htr-dashboard"