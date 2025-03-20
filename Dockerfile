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

# Copy .env file or create if it doesn't exist
COPY .env ./

# Add the base path configuration
RUN echo "BASE_PATH=/prompter" >> .env

# Expose the port the app will run on
EXPOSE 8080

# Set environment variables
ENV PORT=8080
ENV NODE_ENV=production

# Create dummy frontend directory structure
RUN mkdir -p frontend-new/public frontend-new/.next/static

# Run deployment checks and then start the application
CMD ["sh", "-c", "node backend/src/deploy-check.js || node backend/src/api.js"]
