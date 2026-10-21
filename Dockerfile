# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependency manifests first for cached layer installation
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy application code and processed data
COPY . .

# Set default production environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
