#!/bin/bash

# Production deployment script for HTR Dashboard
# This script handles building and deploying the application safely

set -e  # Exit on any error

echo "🚀 Starting HTR Dashboard deployment..."

# Configuration
NODE_ENV="production"
BUILD_DIR="dist"
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check if .env.production exists
    if [ ! -f ".env.production" ]; then
        log_warning ".env.production not found, using .env.example"
        if [ -f ".env.example" ]; then
            cp .env.example .env.production
        else
            log_error "No environment configuration found"
            exit 1
        fi
    fi
    
    log_success "Prerequisites check passed"
}

# Clean previous builds
clean_build() {
    log_info "Cleaning previous builds..."
    
    if [ -d "$BUILD_DIR" ]; then
        # Create backup of previous build
        mkdir -p "$BACKUP_DIR"
        cp -r "$BUILD_DIR" "$BACKUP_DIR/previous_build"
        log_info "Previous build backed up to $BACKUP_DIR"
        
        # Clean build directory
        rm -rf "$BUILD_DIR"
    fi
    
    log_success "Build directory cleaned"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    # Check if node_modules exists and package-lock.json is newer
    if [ -d "node_modules" ] && [ "package-lock.json" -nt "node_modules" ]; then
        log_info "Dependencies are up to date, skipping install"
    else
        npm ci --production=false
        log_success "Dependencies installed"
    fi
}

# Run tests
run_tests() {
    log_info "Running tests..."
    
    # Type checking
    log_info "Running TypeScript type checking..."
    npm run type-check
    
    # Linting
    log_info "Running ESLint with production config..."
    npm run lint:prod
    
    log_success "All tests passed"
}

# Build application
build_application() {
    log_info "Building application for production..."
    
    # Set production environment
    export NODE_ENV=production
    
    # Build the application
    npm run build:prod
    
    # Verify build output
    if [ ! -d "$BUILD_DIR" ]; then
        log_error "Build failed - no output directory found"
        exit 1
    fi
    
    # Check if index.html exists
    if [ ! -f "$BUILD_DIR/index.html" ]; then
        log_error "Build failed - no index.html found"
        exit 1
    fi
    
    log_success "Application built successfully"
}

# Optimize build
optimize_build() {
    log_info "Optimizing build..."
    
    # Analyze bundle size
    log_info "Analyzing bundle size..."
    npm run build:analyze || log_warning "Bundle analysis failed"
    
    # Generate build report
    echo "Build completed at: $(date)" > "$BUILD_DIR/build-info.txt"
    echo "Git commit: $(git rev-parse HEAD 2>/dev/null || echo 'unknown')" >> "$BUILD_DIR/build-info.txt"
    echo "Build size: $(du -sh $BUILD_DIR | cut -f1)" >> "$BUILD_DIR/build-info.txt"
    
    log_success "Build optimized"
}

# Validate build
validate_build() {
    log_info "Validating build..."
    
    # Check critical files
    critical_files=("index.html" "assets" "manifest.json")
    
    for file in "${critical_files[@]}"; do
        if [ ! -e "$BUILD_DIR/$file" ]; then
            log_error "Critical file missing: $file"
            exit 1
        fi
    done
    
    # Check build size (warn if > 10MB)
    build_size=$(du -s "$BUILD_DIR" | cut -f1)
    if [ "$build_size" -gt 10240 ]; then  # 10MB in KB
        log_warning "Build size is large: $(du -sh $BUILD_DIR | cut -f1)"
    fi
    
    log_success "Build validation passed"
}

# Preview build locally
preview_build() {
    if [ "$1" = "--preview" ]; then
        log_info "Starting preview server..."
        npm run preview:prod &
        PREVIEW_PID=$!
        
        echo "Preview server started at http://localhost:4173"
        echo "Press any key to continue with deployment or Ctrl+C to cancel..."
        read -n 1 -s
        
        # Stop preview server
        kill $PREVIEW_PID 2>/dev/null || true
    fi
}

# Deploy to hosting platform
deploy_to_hosting() {
    log_info "Preparing for deployment..."
    
    # Create deployment archive
    tar -czf "htr-dashboard-$(date +%Y%m%d_%H%M%S).tar.gz" -C "$BUILD_DIR" .
    
    # Deployment instructions
    echo ""
    echo "📦 Build ready for deployment!"
    echo ""
    echo "Deploy to your hosting platform:"
    echo ""
    echo "🔹 Vercel:"
    echo "   npx vercel --prod"
    echo ""
    echo "🔹 Netlify:"
    echo "   npx netlify deploy --prod --dir=$BUILD_DIR"
    echo ""
    echo "🔹 Static hosting:"
    echo "   Upload contents of '$BUILD_DIR' directory"
    echo ""
    echo "🔹 Docker:"
    echo "   docker build -t htr-dashboard ."
    echo "   docker run -p 80:80 htr-dashboard"
    echo ""
    
    # Environment-specific instructions
    echo "🔧 Environment Configuration:"
    echo "   Make sure to set these environment variables on your hosting platform:"
    grep "^VITE_" .env.production | sed 's/^/   /'
    echo ""
    
    log_success "Deployment preparation complete"
}

# Cleanup
cleanup() {
    log_info "Cleaning up..."
    
    # Remove old backups (keep last 5)
    if [ -d "backups" ]; then
        cd backups
        ls -t | tail -n +6 | xargs -r rm -rf
        cd ..
    fi
    
    log_success "Cleanup complete"
}

# Main deployment process
main() {
    echo "========================================"
    echo "🏗️  HTR Dashboard Production Build"
    echo "========================================"
    echo ""
    
    # Parse command line arguments
    PREVIEW_MODE=false
    SKIP_TESTS=false
    
    for arg in "$@"; do
        case $arg in
            --preview)
                PREVIEW_MODE=true
                ;;
            --skip-tests)
                SKIP_TESTS=true
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo ""
                echo "Options:"
                echo "  --preview      Start preview server before deployment"
                echo "  --skip-tests   Skip running tests and linting"
                echo "  --help         Show this help message"
                echo ""
                exit 0
                ;;
        esac
    done
    
    # Run deployment steps
    check_prerequisites
    clean_build
    install_dependencies
    
    if [ "$SKIP_TESTS" = false ]; then
        run_tests
    else
        log_warning "Skipping tests as requested"
    fi
    
    build_application
    optimize_build
    validate_build
    
    if [ "$PREVIEW_MODE" = true ]; then
        preview_build --preview
    fi
    
    deploy_to_hosting
    cleanup
    
    echo ""
    echo "========================================"
    log_success "🎉 Deployment completed successfully!"
    echo "========================================"
    echo ""
    
    # Final instructions
    echo "Next steps:"
    echo "1. Deploy the '$BUILD_DIR' directory to your hosting platform"
    echo "2. Configure environment variables on your hosting platform"
    echo "3. Set up proper security headers (see docs/security.md)"
    echo "4. Configure monitoring and analytics"
    echo ""
    echo "Build information:"
    cat "$BUILD_DIR/build-info.txt" | sed 's/^/   /'
}

# Handle interruption
trap 'echo -e "\n${RED}Deployment interrupted${NC}"; exit 1' INT

# Run main function
main "$@"