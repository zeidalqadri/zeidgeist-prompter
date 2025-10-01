#!/bin/bash

# Zeidgeist Prompter Local Development Setup Script
# This script sets up the complete local development environment

set -e

echo "🚀 Setting up Zeidgeist Prompter local development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Docker is installed and running
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker Desktop first."
        print_info "Visit: https://docs.docker.com/desktop/"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker Desktop."
        exit 1
    fi

    print_status "Docker is installed and running"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi

    NODE_VERSION=$(node --version | cut -d 'v' -f 2 | cut -d '.' -f 1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node --version)"
        exit 1
    fi

    print_status "Node.js $(node --version) is installed"
}

# Install npm dependencies
install_dependencies() {
    print_info "Installing npm dependencies..."
    npm ci
    print_status "Dependencies installed"
}

# Setup environment file
setup_env() {
    if [ ! -f ".env.local" ]; then
        print_info "Creating .env.local from template..."
        cp env.example .env.local
        print_warning "Please edit .env.local and add your API keys and update database connection if needed"
        print_info "Default database URL: postgresql://zeidgeist:zeidgeist123@localhost:5432/zeidgeist_prompter_dev"
    else
        print_status ".env.local already exists"
    fi
}

# Start PostgreSQL with Docker
start_database() {
    print_info "Starting PostgreSQL database with Docker..."
    
    # Stop any existing containers
    docker-compose down --remove-orphans
    
    # Start PostgreSQL
    docker-compose up -d postgres
    
    # Wait for PostgreSQL to be ready
    print_info "Waiting for PostgreSQL to be ready..."
    until docker exec zeidgeist-postgres pg_isready -U zeidgeist -d zeidgeist_prompter_dev; do
        echo "Waiting for PostgreSQL..."
        sleep 2
    done
    
    print_status "PostgreSQL is running on localhost:5432"
}

# Install Wrangler CLI
install_wrangler() {
    if ! command -v wrangler &> /dev/null; then
        print_info "Installing Wrangler CLI..."
        npm install -g wrangler
        print_status "Wrangler CLI installed"
    else
        print_status "Wrangler CLI is already installed"
    fi
}

# Run database migrations
run_migrations() {
    print_info "Running database migrations..."
    npm run db:generate
    npm run db:migrate
    print_status "Database migrations completed"
}

# Validate environment
validate_env() {
    print_info "Validating environment configuration..."
    if npm run validate:env; then
        print_status "Environment validation passed"
    else
        print_warning "Environment validation failed. Please check your .env.local file"
    fi
}

# Build application
build_app() {
    print_info "Building application for local deployment..."
    npm run build
    print_status "Application built successfully"
}

# Print final instructions
print_final_instructions() {
    echo ""
    echo "🎉 Local development environment setup complete!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Edit .env.local and add your API keys (Claude, OpenAI, etc.)"
    echo "2. Start the development servers:"
    echo ""
    echo "   Terminal 1 - Next.js development server:"
    echo "   npm run dev"
    echo ""
    echo "   Terminal 2 - Cloudflare Workers (after building):"
    echo "   wrangler pages dev dist --compatibility-date=2024-01-15"
    echo ""
    echo "🌐 Access URLs:"
    echo "   - Frontend: http://localhost:3333"
    echo "   - API: http://localhost:8788"
    echo "   - pgAdmin (optional): http://localhost:5050"
    echo ""
    echo "🛠️  Database management:"
    echo "   - View database: docker-compose --profile tools up -d pgadmin"
    echo "   - Stop database: docker-compose down"
    echo "   - Database studio: npm run db:studio"
    echo ""
    echo "🧪 Testing:"
    echo "   - Unit tests: npm run test:unit"
    echo "   - Integration tests: npm run test:integration"
    echo "   - All tests: npm test"
    echo ""
}

# Main setup flow
main() {
    echo "Starting local development setup..."
    
    check_docker
    check_node
    install_dependencies
    setup_env
    start_database
    install_wrangler
    
    # Wait a moment for database to be fully ready
    sleep 3
    
    run_migrations
    validate_env
    build_app
    
    print_final_instructions
}

# Run main function
main "$@"
