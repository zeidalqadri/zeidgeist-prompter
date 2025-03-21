FROM node:18-slim AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install dependencies at root level
RUN npm ci

# Copy application code for build
COPY frontend ./frontend/
COPY backend ./backend/

# Build the Next.js frontend
WORKDIR /app/frontend
RUN npm run build

# Now create the production image
FROM node:18-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install production dependencies
RUN npm ci --only=production

# Copy backend code
COPY backend/ ./backend/

# Copy the built frontend
COPY --from=builder /app/frontend/.next/standalone/ ./frontend/
COPY --from=builder /app/frontend/.next/static/ ./frontend/.next/static/
COPY --from=builder /app/frontend/public/ ./frontend/public/

# Set environment variables - moved before any deployment checks
ENV PORT=10000
ENV NODE_ENV=production
ENV BASE_PATH=/prompter
ENV USE_EXTERNAL_APIS=true

# Expose the port the app will run on (explicitly use the same port as the ENV setting)
EXPOSE 10000

# Create dummy frontend directory structure if needed
RUN mkdir -p frontend-new/public frontend-new/.next/static

# Run the application with proper validation
CMD ["/bin/bash", "-c", "node backend/scripts/deployment-validate.js && node backend/src/api.js"]
