# Start with a clean Node.js base image
FROM node:18-slim

# Set a unique argument to force cache busting on each build
ARG CACHE_BUST=1
RUN echo "Cache bust: ${CACHE_BUST}"

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY frontend/package.json frontend/package-lock.json* ./frontend/
COPY backend/package.json backend/package-lock.json* ./backend/

# Install dependencies without using cache
RUN npm install --no-cache

# Copy application code
COPY . .

# Build frontend
RUN cd frontend && npm run build

# Environment variables
ENV PORT=10000
ENV NODE_ENV=production
ENV BASE_PATH=/prompter
ENV USE_EXTERNAL_APIS=true

# Expose port
EXPOSE 10000

# Start the server
CMD ["node", "backend/src/api.js"]
