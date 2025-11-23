#!/bin/bash

# Database Migration Verification Script
# Verifies that all required tables and indexes exist

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}=================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL environment variable not set"
    read -p "Enter your DATABASE_URL: " DATABASE_URL
    export DATABASE_URL
fi

print_header "Database Migration Verification"

# Test connection
print_info "Testing database connection..."
if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    print_success "Database connection successful"
else
    print_error "Failed to connect to database"
    exit 1
fi

echo ""

# Check for required tables
print_header "Checking Required Tables"

REQUIRED_TABLES=("images" "imageGenerations" "imageAnalyses" "imageQuotas")
MISSING_TABLES=()

for table in "${REQUIRED_TABLES[@]}"; do
    if psql "$DATABASE_URL" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" | grep -q "t"; then
        print_success "Table '$table' exists"
    else
        print_error "Table '$table' missing"
        MISSING_TABLES+=("$table")
    fi
done

echo ""

if [ ${#MISSING_TABLES[@]} -gt 0 ]; then
    print_warning "Missing ${#MISSING_TABLES[@]} tables: ${MISSING_TABLES[*]}"
    read -p "Do you want to run the migration now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ -f "migrations/001_add_image_tables.sql" ]; then
            print_info "Running migration..."
            psql "$DATABASE_URL" -f migrations/001_add_image_tables.sql
            print_success "Migration completed"
        else
            print_error "Migration file not found: migrations/001_add_image_tables.sql"
            exit 1
        fi
    else
        print_warning "Migration skipped"
        exit 1
    fi
fi

# Check table schemas
print_header "Verifying Table Schemas"

# Check images table columns
print_info "Checking 'images' table schema..."
IMAGES_COLUMNS=$(psql "$DATABASE_URL" -t -c "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'images' ORDER BY column_name;" | tr '\n' ',' | sed 's/,$//')
EXPECTED_IMAGES_COLS="createdAt,filename,hasWatermark,height,id,ipAddress,mimeType,r2Key,size,status,updatedAt,userId,virusScanResult,virusScanStatus,width"

if echo "$IMAGES_COLUMNS" | grep -q "r2Key"; then
    print_success "Images table schema valid"
else
    print_error "Images table schema incomplete"
fi

# Check imageGenerations table columns
print_info "Checking 'imageGenerations' table schema..."
if psql "$DATABASE_URL" -t -c "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'imageGenerations' AND column_name = 'prompt';" | grep -q "prompt"; then
    print_success "ImageGenerations table schema valid"
else
    print_error "ImageGenerations table schema incomplete"
fi

# Check imageAnalyses table columns
print_info "Checking 'imageAnalyses' table schema..."
if psql "$DATABASE_URL" -t -c "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'imageAnalyses' AND column_name = 'analysisType';" | grep -q "analysisType"; then
    print_success "ImageAnalyses table schema valid"
else
    print_error "ImageAnalyses table schema incomplete"
fi

# Check imageQuotas table columns
print_info "Checking 'imageQuotas' table schema..."
if psql "$DATABASE_URL" -t -c "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'imageQuotas' AND column_name = 'generationsUsed';" | grep -q "generationsUsed"; then
    print_success "ImageQuotas table schema valid"
else
    print_error "ImageQuotas table schema incomplete"
fi

echo ""

# Check for indexes
print_header "Checking Indexes"

check_index() {
    INDEX_NAME=$1
    if psql "$DATABASE_URL" -t -c "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname = '$INDEX_NAME';" | grep -q "$INDEX_NAME"; then
        print_success "Index '$INDEX_NAME' exists"
        return 0
    else
        print_warning "Index '$INDEX_NAME' missing (optional, will affect performance)"
        return 1
    fi
}

check_index "images_userId_idx"
check_index "images_r2Key_idx"
check_index "imageGenerations_userId_idx"
check_index "imageAnalyses_imageId_idx"
check_index "imageQuotas_userId_date_idx"

echo ""

# Test basic operations
print_header "Testing Basic Operations"

# Test SELECT
print_info "Testing SELECT query..."
if psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM images;" > /dev/null 2>&1; then
    IMAGES_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM images;")
    print_success "SELECT works ($IMAGES_COUNT images in database)"
else
    print_error "SELECT query failed"
fi

# Test INSERT (with rollback)
print_info "Testing INSERT query..."
TEST_UUID=$(uuidgen)
psql "$DATABASE_URL" > /dev/null 2>&1 <<EOF
BEGIN;
INSERT INTO images (id, userId, filename, r2Key, mimeType, size, status)
VALUES ('$TEST_UUID', '$TEST_UUID', 'test.png', 'test/test.png', 'image/png', 1024, 'active');
ROLLBACK;
EOF

if [ $? -eq 0 ]; then
    print_success "INSERT works (test rolled back)"
else
    print_error "INSERT query failed"
fi

# Test foreign key constraints
print_info "Testing foreign key constraints..."
if psql "$DATABASE_URL" -t -c "SELECT conname FROM pg_constraint WHERE conrelid = 'images'::regclass AND contype = 'f';" | grep -q "images_userId_users_id_fk"; then
    print_success "Foreign key constraints exist"
else
    print_warning "Some foreign key constraints may be missing"
fi

echo ""

# Database statistics
print_header "Database Statistics"

echo "Table Sizes:"
psql "$DATABASE_URL" -c "
SELECT
    schemaname AS schema,
    tablename AS table,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('images', 'imageGenerations', 'imageAnalyses', 'imageQuotas')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

echo ""
echo "Row Counts:"
echo "  images: $(psql "$DATABASE_URL" -t -c 'SELECT COUNT(*) FROM images;')"
echo "  imageGenerations: $(psql "$DATABASE_URL" -t -c 'SELECT COUNT(*) FROM imageGenerations;')"
echo "  imageAnalyses: $(psql "$DATABASE_URL" -t -c 'SELECT COUNT(*) FROM imageAnalyses;')"
echo "  imageQuotas: $(psql "$DATABASE_URL" -t -c 'SELECT COUNT(*) FROM imageQuotas;')"

echo ""

# Final summary
print_header "Verification Summary"

echo ""
ALL_TABLES_EXIST=true
for table in "${REQUIRED_TABLES[@]}"; do
    if ! psql "$DATABASE_URL" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" | grep -q "t"; then
        ALL_TABLES_EXIST=false
    fi
done

if [ "$ALL_TABLES_EXIST" = true ]; then
    print_success "All required tables exist"
    print_success "Database is ready for image generation features"
else
    print_error "Some tables are missing"
    print_error "Run migration: psql \$DATABASE_URL < migrations/001_add_image_tables.sql"
    exit 1
fi

echo ""
print_info "Next steps:"
echo "  1. Verify R2 buckets: wrangler r2 bucket list"
echo "  2. Verify KV namespaces: wrangler kv:namespace list"
echo "  3. Configure Cloudflare bindings in dashboard"
echo "  4. Set environment variables in Cloudflare Pages"
echo ""
