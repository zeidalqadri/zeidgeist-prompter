FROM node:18-slim AS builder

# Set working directory
WORKDIR /app

# Copy package files individually to avoid caching issues
COPY package.json .
COPY frontend/package.json frontend/
COPY backend/package.json backend/

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Build frontend
WORKDIR /app/frontend
RUN npm run build

# Create production image
FROM node:18-slim

WORKDIR /app

# Copy package files for production
COPY package.json .
COPY backend/package.json backend/

# Install production dependencies
RUN npm install --only=production

# Copy backend code
COPY backend ./backend/

# Copy built frontend from builder stage
COPY --from=builder /app/frontend/.next/standalone/ ./frontend/
COPY --from=builder /app/frontend/.next/static/ ./frontend/.next/static/
COPY --from=builder /app/frontend/public/ ./frontend/public/

# Set environment variables
ENV PORT=10000
ENV NODE_ENV=production
ENV BASE_PATH=/prompter
ENV USE_EXTERNAL_APIS=true

# Expose port
EXPOSE 10000

# Run the application
CMD ["node", "backend/src/api.js"]
