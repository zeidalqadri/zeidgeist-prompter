# Use the official Node.js 18 image as base
FROM node:18-slim

# Set working directory
WORKDIR /app

# Copy package.json files first
COPY package.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

# Install all dependencies (including devDependencies)
RUN npm install

# Copy the entire codebase
COPY . .

# Build the frontend
WORKDIR /app/frontend
RUN npm run build

# Return to the main directory
WORKDIR /app

# Set environment variables
ENV PORT=10000
ENV NODE_ENV=production
ENV BASE_PATH=/prompter
ENV USE_EXTERNAL_APIS=true

# Expose the application port
EXPOSE 10000

# Validate environment and start the application
CMD ["sh", "-c", "node backend/scripts/deployment-validate.js && node backend/src/api.js"]
