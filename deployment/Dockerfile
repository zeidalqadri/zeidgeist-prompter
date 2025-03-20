FROM node:18-slim AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install dependencies at root level
RUN npm ci

# Copy application code
COPY frontend/ ./frontend/
COPY backend/ ./backend/
COPY scripts/ ./scripts/
# Skip copying .env file as it might not exist in the build context

# Set the base path for Next.js
ENV BASE_PATH=/prompter

# Install Next.js if not already in node_modules
RUN cd frontend && npm install next

# Build the Next.js frontend
WORKDIR /app/frontend
RUN npm run build

# Now create the production image
FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install production dependencies
RUN npm ci --only=production

# Install crypto for user identification (it's a Node.js built-in, but ensure it's available)
RUN npm install crypto

# Copy backend code
COPY backend/ ./backend/

# Copy the Next.js static files and public directory
# We're not using the standalone server anymore, just the static files
COPY --from=builder /app/frontend/.next/static/ ./frontend/.next/static/
COPY --from=builder /app/frontend/.next/server/ ./frontend/.next/server/
COPY --from=builder /app/frontend/public/ ./frontend/public/

# Create temp directory for fallback HTML
RUN mkdir -p ./temp

# Create default .env file but allow overriding with build args
ARG DEEPSEEK_API_KEY=placeholder
ARG MISTRAL_API_KEY=placeholder
ARG CLAUDE_API_KEY=placeholder
ARG GEMINI_API_KEY=placeholder
ARG USE_EXTERNAL_APIS=true
ARG MONGODB_URI=mongodb://localhost:27017/promptEnhancer

# Create .env file with environment variables
RUN echo "DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}" > .env && \
    echo "MISTRAL_API_KEY=${MISTRAL_API_KEY}" >> .env && \
    echo "GEMINI_API_KEY=${GEMINI_API_KEY}" >> .env && \
    echo "CLAUDE_API_KEY=${CLAUDE_API_KEY}" >> .env && \
    echo "USE_EXTERNAL_APIS=${USE_EXTERNAL_APIS}" >> .env && \
    echo "MONGODB_URI=${MONGODB_URI}" >> .env

# Add the base path configuration
RUN echo "BASE_PATH=/prompter" >> .env

# Set environment variables that can be overridden at runtime
ENV DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
ENV MISTRAL_API_KEY=${MISTRAL_API_KEY}
ENV CLAUDE_API_KEY=${CLAUDE_API_KEY}
ENV GEMINI_API_KEY=${GEMINI_API_KEY}
ENV USE_EXTERNAL_APIS=${USE_EXTERNAL_APIS}
ENV MONGODB_URI=${MONGODB_URI}
ENV BASE_PATH=/prompter
ENV BASE_URL=/prompter

# Set environment variables
ENV PORT=8080
ENV NODE_ENV=production

# Expose the port the app will run on
EXPOSE 8080

# Run deployment checks and then start the application
CMD ["sh", "-c", "node backend/src/deploy-check.js || node backend/src/api.js"]
