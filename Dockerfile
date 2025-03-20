FROM node:18-slim AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend-new/package*.json ./frontend-new/
COPY backend/package*.json ./backend/

# Install dependencies at root level
RUN npm ci

# Build the Next.js frontend
WORKDIR /app/frontend-new
RUN npm run build

# Now create the production image
FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install production dependencies
RUN npm ci --only=production

# Copy backend code
COPY backend/ ./backend/

# Copy the built frontend
COPY --from=builder /app/frontend-new/.next/standalone/ ./frontend-new/
COPY --from=builder /app/frontend-new/.next/static/ ./frontend-new/.next/static/
COPY --from=builder /app/frontend-new/public/ ./frontend-new/public/

# Create .env file with API keys
COPY .env ./

# Add the base path configuration
RUN echo "BASE_PATH=$BASE_URL" >> .env

# Expose the port the app will run on
EXPOSE 8080

# Set environment variables
ENV PORT=8080
ENV NODE_ENV=production

# Run deployment checks and then start the application
CMD ["sh", "-c", "node backend/src/deploy-check.js || node backend/src/api.js"]
