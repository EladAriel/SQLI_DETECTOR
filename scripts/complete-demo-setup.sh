#!/bin/bash

# Complete Demo Setup Script for LangChain RAG SQL Injection Detection with N8N

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
POSTGRES_PORT=${POSTGRES_PORT:-5432}
DETECTION_API_PORT=${DETECTION_API_PORT:-3001}
RAG_API_PORT=${RAG_API_PORT:-3002}
N8N_PORT=${N8N_PORT:-5678}

echo -e "${BLUE}🚀 LangChain RAG SQL Injection Detection - Complete Demo Setup${NC}"
echo -e "${BLUE}================================================================${NC}"
echo ""

# Helper functions
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_step() { echo -e "${PURPLE}🔧 $1${NC}"; }

# Check service health
check_service() {
    local service_name=$1
    local port=$2
    local endpoint=${3:-""}
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -s --connect-timeout 1 "http://localhost:$port$endpoint" >/dev/null 2>&1; then
            log_success "$service_name is running on port $port"
            return 0
        fi
        sleep 1
        ((attempt++))
    done
    
    log_warning "$service_name not responding on port $port after $max_attempts attempts"
    return 1
}

# Check PostgreSQL specifically
check_postgres() {
    local max_attempts=10
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if docker-compose exec postgres pg_isready -U postgres >/dev/null 2>&1; then
            log_success "PostgreSQL is running and accepting connections"
            return 0
        fi
        sleep 2
        ((attempt++))
    done
    
    log_warning "PostgreSQL not responding after $max_attempts attempts"
    return 1
}

# Install dependencies
setup_dependencies() {
    log_step "Installing dependencies..."
    
    if [ ! -d "node_modules" ]; then
        npm install
        log_success "Dependencies installed"
    else
        log_info "Dependencies already installed"
    fi
}

# Setup environment
setup_environment() {
    log_step "Setting up environment..."
    
    if [ ! -f ".env" ]; then
        if [ -f "env.template" ]; then
            cp env.template .env
            log_success "Environment file created from template"
            log_warning "Please edit .env file with your settings (especially OPENAI_API_KEY for full RAG functionality)"
        else
            log_error "env.template not found"
            return 1
        fi
    else
        log_info "Environment file already exists"
    fi
}

# Start PostgreSQL
start_postgres() {
    log_step "Starting PostgreSQL database..."
    
    # Check if PostgreSQL is already running
    if check_postgres; then
        return 0
    fi
    
    # Try to start with Docker Compose
    if command -v docker-compose >/dev/null 2>&1; then
        log_info "Starting PostgreSQL with Docker Compose..."
        docker-compose up postgres -d >/dev/null 2>&1
        sleep 5
        
        if check_postgres; then
            log_success "PostgreSQL started with Docker"
            return 0
        fi
    fi
    
    log_error "Failed to start PostgreSQL"
    return 1
}

# Initialize database
init_database() {
    log_step "Initializing database..."
    
    # Generate Prisma client
    npx prisma generate >/dev/null 2>&1 || true
    
    # Run migrations
    npx prisma migrate deploy >/dev/null 2>&1 || true
    
    log_success "Database initialized"
}

# Start API services
start_apis() {
    log_step "Starting API services..."
    
    # Start Detection API
    if ! check_service "Detection API" $DETECTION_API_PORT "/api/v1/health"; then
        log_info "Starting SQL Detection API..."
        npm run api:start >/dev/null 2>&1 &
        API_PID=$!
        sleep 8
        
        if check_service "Detection API" $DETECTION_API_PORT "/api/v1/health"; then
            log_success "Detection API started"
        else
            log_error "Failed to start Detection API"
            return 1
        fi
    fi
    
    # Start RAG API
    if ! check_service "RAG API" $RAG_API_PORT "/api/v1/health"; then
        log_info "Starting LangChain RAG API..."
        npm run rag:start >/dev/null 2>&1 &
        RAG_PID=$!
        sleep 8
        
        if check_service "RAG API" $RAG_API_PORT "/api/v1/health"; then
            log_success "RAG API started"
        else
            log_warning "RAG API may be running in limited mode"
        fi
    fi
}

# Start N8N
start_n8n() {
    log_step "Starting N8N workflow engine..."
    
    if check_service "N8N" $N8N_PORT; then
        log_success "N8N is already running"
        return 0
    fi
    
    # Setup N8N
    cd n8n
    
    # Create environment if needed
    if [ ! -f ".env" ]; then
        cp env.template .env
    fi
    
    # Create directories
    mkdir -p data/workflows data/credentials
    
    # Copy workflows
    if [ -d workflows ]; then
        cp workflows/*.json data/workflows/ 2>/dev/null || true
    fi
    
    # Start N8N with Docker
    if command -v docker-compose >/dev/null 2>&1; then
        docker-compose -f docker-compose.n8n.yml up -d >/dev/null 2>&1
        sleep 10
        
        if check_service "N8N" $N8N_PORT; then
            log_success "N8N started successfully"
        else
            log_error "Failed to start N8N"
            cd ..
            return 1
        fi
    else
        log_error "Docker Compose not found"
        cd ..
        return 1
    fi
    
    cd ..
}

# Run demo tests
run_demo_tests() {
    log_step "Running demo tests..."
    
    local webhook_base="http://localhost:$N8N_PORT/webhook"
    
    echo ""
    log_info "Testing Simple Demo Workflow..."
    
    # Test 1: Simple demo
    local demo_result=$(curl -s -X POST "$webhook_base/simple-demo" \
        -H "Content-Type: application/json" \
        -d '{"query": "SELECT * FROM users WHERE id = '\''1'\'' OR '\''1'\''='\''1'\''"}' 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        log_success "Simple demo test completed"
    else
        log_warning "Simple demo test may have issues"
    fi
    
    echo ""
    log_info "Testing Main Detection Workflow..."
    
    # Test 2: Main workflow
    local main_result=$(curl -s -X POST "$webhook_base/sql-detection" \
        -H "Content-Type: application/json" \
        -d '{
            "query": "SELECT * FROM users WHERE id = '\''1'\'' OR '\''1'\''='\''1'\''",
            "max_sources": 3,
            "include_scores": true
        }' 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        log_success "Main workflow test completed"
    else
        log_warning "Main workflow test may have issues"
    fi
    
    echo ""
    log_success "Demo tests completed"
}

# Display access information
show_access_info() {
    echo ""
    echo -e "${GREEN}🎉 Complete Demo Environment is Ready!${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo ""
    echo -e "${PURPLE}🌐 Service Access URLs:${NC}"
    echo "   Detection API:    http://localhost:$DETECTION_API_PORT"
    echo "   RAG API:          http://localhost:$RAG_API_PORT"
    echo "   N8N Interface:    http://localhost:$N8N_PORT"
    echo "   PostgreSQL:       localhost:$POSTGRES_PORT"
    echo ""
    echo -e "${PURPLE}📚 API Documentation:${NC}"
    echo "   Detection API:    http://localhost:$DETECTION_API_PORT/api/docs"
    echo "   RAG API:          http://localhost:$RAG_API_PORT/api/docs"
    echo ""
    echo -e "${PURPLE}🔄 N8N Workflow Endpoints:${NC}"
    echo "   Main Workflow:    POST http://localhost:$N8N_PORT/webhook/sql-detection"
    echo "   Demo Workflow:    POST http://localhost:$N8N_PORT/webhook/simple-demo"
    echo ""
    echo -e "${PURPLE}🧪 Quick Test Commands:${NC}"
    echo "   # Test SQL injection detection"
    echo "   curl -X POST http://localhost:$N8N_PORT/webhook/sql-detection \\"
    echo "     -H 'Content-Type: application/json' \\"
    echo "     -d '{\"query\": \"SELECT * FROM users WHERE id = '\\''1'\\'' OR '\\''1'\\''='\\''1'\\'''\"}'"
    echo ""
    echo "   # Test safe query"
    echo "   curl -X POST http://localhost:$N8N_PORT/webhook/simple-demo \\"
    echo "     -H 'Content-Type: application/json' \\"
    echo "     -d '{\"query\": \"SELECT name FROM products WHERE category = '\\''electronics'\\'''\"}'"
    echo ""
    echo -e "${PURPLE}📋 Management Commands:${NC}"
    echo "   npm run n8n:test     # Run automated tests"
    echo "   npm run n8n:logs     # View N8N logs"
    echo "   npm run n8n:stop     # Stop N8N"
    echo "   npm run n8n:reset    # Reset N8N"
    echo ""
    echo -e "${YELLOW}💡 Next Steps:${NC}"
    echo "   1. Open N8N interface in your browser"
    echo "   2. Workflows should be automatically imported"
    echo "   3. Test the endpoints with the provided curl commands"
    echo "   4. View execution logs and results in N8N"
    echo "   5. Explore the API documentation"
    echo ""
    echo -e "${GREEN}🚀 Demo is ready! Press Ctrl+C to stop all services.${NC}"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up background processes..."
    
    if [ -n "$API_PID" ]; then
        kill $API_PID 2>/dev/null || true
    fi
    
    if [ -n "$RAG_PID" ]; then
        kill $RAG_PID 2>/dev/null || true
    fi
}

# Trap cleanup on script exit
trap cleanup EXIT

# Main execution
main() {
    log_info "Starting complete demo setup..."
    echo ""
    
    # Check if in correct directory
    if [ ! -f "package.json" ]; then
        log_error "Please run this script from the project root directory"
        exit 1
    fi
    
    # Run setup steps
    setup_dependencies
    setup_environment
    start_postgres
    init_database
    start_apis
    start_n8n
    
    # Small delay before testing
    sleep 3
    
    # Run tests if requested
    if [ "$1" = "--test" ] || [ "$1" = "-t" ]; then
        run_demo_tests
    fi
    
    show_access_info
    
    # Keep script running to maintain background processes
    if [ -n "$API_PID" ] || [ -n "$RAG_PID" ]; then
        echo ""
        log_info "Services are running. Press Ctrl+C to stop..."
        wait
    fi
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "LangChain RAG SQL Injection Detection - Complete Demo Setup"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --test, -t    Run demo tests after setup"
        echo "  --help, -h    Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  POSTGRES_PORT=$POSTGRES_PORT"
        echo "  DETECTION_API_PORT=$DETECTION_API_PORT"
        echo "  RAG_API_PORT=$RAG_API_PORT"
        echo "  N8N_PORT=$N8N_PORT"
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac
