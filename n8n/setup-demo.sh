#!/bin/bash

# N8N Setup and Demo Script for LangChain RAG SQL Injection Detection

set -e

echo "🚀 Setting up N8N for LangChain RAG SQL Injection Detection Demo"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
N8N_PORT=${N8N_PORT:-5678}
RAG_API_PORT=${RAG_API_PORT:-3002}
DETECTION_API_PORT=${DETECTION_API_PORT:-3001}
POSTGRES_PORT=${POSTGRES_PORT:-5432}

echo -e "${BLUE}Configuration:${NC}"
echo "  N8N Port: $N8N_PORT"
echo "  RAG API Port: $RAG_API_PORT" 
echo "  Detection API Port: $DETECTION_API_PORT"
echo "  PostgreSQL Port: $POSTGRES_PORT"
echo ""

# Check if required services are running
check_service() {
    local service_name=$1
    local port=$2
    local max_attempts=30
    local attempt=1

    echo -e "${YELLOW}Checking $service_name on port $port...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s --connect-timeout 1 http://localhost:$port/health >/dev/null 2>&1 || \
           curl -s --connect-timeout 1 http://localhost:$port >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name is running${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}⏳ Waiting for $service_name (attempt $attempt/$max_attempts)...${NC}"
        sleep 2
        ((attempt++))
    done
    
    echo -e "${RED}❌ $service_name is not responding after $max_attempts attempts${NC}"
    return 1
}

# Start prerequisite services if not running
start_prerequisites() {
    echo -e "${BLUE}🔧 Starting prerequisite services...${NC}"
    
    # Start PostgreSQL
    if ! check_service "PostgreSQL" $POSTGRES_PORT; then
        echo -e "${YELLOW}Starting PostgreSQL...${NC}"
        cd ..
        npm run postgres:start
        cd n8n
        sleep 5
    fi
    
    # Start RAG API
    if ! check_service "RAG API" $RAG_API_PORT; then
        echo -e "${YELLOW}Starting LangChain RAG API...${NC}"
        cd ..
        npm run rag:start &
        RAG_PID=$!
        cd n8n
        sleep 10
    fi
    
    # Start Detection API  
    if ! check_service "Detection API" $DETECTION_API_PORT; then
        echo -e "${YELLOW}Starting SQL Detection API...${NC}"
        cd ..
        npm run api:start &
        DETECTION_PID=$!
        cd n8n
        sleep 10
    fi
}

# Setup N8N environment
setup_n8n() {
    echo -e "${BLUE}🏗️ Setting up N8N environment...${NC}"
    
    # Create environment file if it doesn't exist
    if [ ! -f .env ]; then
        echo -e "${YELLOW}Creating N8N environment file...${NC}"
        cp env.template .env
        echo -e "${GREEN}✅ Environment file created${NC}"
    fi
    
    # Create data directories
    mkdir -p data/workflows data/credentials
    
    # Copy workflows to data directory
    if [ -d workflows ]; then
        cp workflows/*.json data/workflows/ 2>/dev/null || true
        echo -e "${GREEN}✅ Workflows copied to N8N data directory${NC}"
    fi
}

# Start N8N
start_n8n() {
    echo -e "${BLUE}🚀 Starting N8N...${NC}"
    
    # Check if N8N is already running
    if check_service "N8N" $N8N_PORT; then
        echo -e "${GREEN}✅ N8N is already running${NC}"
        return 0
    fi
    
    # Start with Docker Compose
    if command -v docker-compose >/dev/null 2>&1; then
        echo -e "${YELLOW}Starting N8N with Docker Compose...${NC}"
        docker-compose -f docker-compose.n8n.yml up -d
        
        # Wait for N8N to be ready
        local max_attempts=60
        local attempt=1
        
        while [ $attempt -le $max_attempts ]; do
            if curl -s http://localhost:$N8N_PORT >/dev/null 2>&1; then
                echo -e "${GREEN}✅ N8N is ready!${NC}"
                break
            fi
            echo -e "${YELLOW}⏳ Waiting for N8N to start (attempt $attempt/$max_attempts)...${NC}"
            sleep 2
            ((attempt++))
        done
        
        if [ $attempt -gt $max_attempts ]; then
            echo -e "${RED}❌ N8N failed to start${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Docker Compose not found. Please install Docker and Docker Compose.${NC}"
        return 1
    fi
}

# Run demo tests
run_demo_tests() {
    echo -e "${BLUE}🧪 Running demo tests...${NC}"
    
    local webhook_url="http://localhost:$N8N_PORT/webhook"
    
    echo -e "${YELLOW}Testing Simple Demo Workflow...${NC}"
    
    # Test 1: Simple demo with random query
    echo "Test 1: Random demo query"
    curl -s -X POST "$webhook_url/simple-demo" \
        -H "Content-Type: application/json" \
        -d '{}' | jq '.' || echo "Demo test completed (jq not available for formatting)"
    
    echo ""
    echo -e "${YELLOW}Testing Main Detection Workflow...${NC}"
    
    # Test 2: SQL injection payload
    echo "Test 2: SQL injection detection"
    curl -s -X POST "$webhook_url/sql-detection" \
        -H "Content-Type: application/json" \
        -d '{
            "query": "SELECT * FROM users WHERE id = '\''1'\'' OR '\''1'\''='\''1'\''",
            "max_sources": 3,
            "include_scores": true
        }' | jq '.vulnerability_assessment // .' || echo "SQL injection test completed"
    
    echo ""
    
    # Test 3: Safe query
    echo "Test 3: Safe query analysis"
    curl -s -X POST "$webhook_url/sql-detection" \
        -H "Content-Type: application/json" \
        -d '{
            "query": "SELECT name FROM products WHERE category = '\''electronics'\''",
            "max_sources": 2
        }' | jq '.vulnerability_assessment // .' || echo "Safe query test completed"
    
    echo ""
    echo -e "${GREEN}✅ Demo tests completed!${NC}"
}

# Display access information
show_access_info() {
    echo ""
    echo -e "${GREEN}🎉 N8N LangChain RAG Demo is ready!${NC}"
    echo ""
    echo -e "${BLUE}Access Information:${NC}"
    echo "  🌐 N8N Interface: http://localhost:$N8N_PORT"
    echo "  📊 LangChain RAG API: http://localhost:$RAG_API_PORT"
    echo "  🔍 Detection API: http://localhost:$DETECTION_API_PORT"
    echo ""
    echo -e "${BLUE}Webhook Endpoints:${NC}"
    echo "  🎯 Main Workflow: POST http://localhost:$N8N_PORT/webhook/sql-detection"
    echo "  🎲 Demo Workflow: POST http://localhost:$N8N_PORT/webhook/simple-demo"
    echo ""
    echo -e "${BLUE}Sample Test Commands:${NC}"
    echo "  # Test SQL injection detection"
    echo "  curl -X POST http://localhost:$N8N_PORT/webhook/sql-detection \\"
    echo "    -H 'Content-Type: application/json' \\"
    echo "    -d '{\"query\": \"SELECT * FROM users WHERE id = '\\''1'\\'' OR '\\''1'\\''='\\''1'\\'''\"}'"
    echo ""
    echo "  # Quick demo"
    echo "  curl -X POST http://localhost:$N8N_PORT/webhook/simple-demo \\"
    echo "    -H 'Content-Type: application/json' -d '{}'"
    echo ""
    echo -e "${YELLOW}📋 Next Steps:${NC}"
    echo "  1. Open N8N interface in your browser"
    echo "  2. Import workflows from n8n/workflows/ directory"
    echo "  3. Activate the workflows"
    echo "  4. Test with the webhook endpoints"
    echo "  5. View execution logs and results in N8N"
}

# Cleanup function
cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up...${NC}"
    
    if [ -n "$RAG_PID" ]; then
        kill $RAG_PID 2>/dev/null || true
    fi
    
    if [ -n "$DETECTION_PID" ]; then
        kill $DETECTION_PID 2>/dev/null || true
    fi
}

# Trap cleanup on script exit
trap cleanup EXIT

# Main execution
main() {
    echo -e "${GREEN}Starting N8N LangChain RAG Demo Setup...${NC}"
    echo ""
    
    # Check if in correct directory
    if [ ! -f "docker-compose.n8n.yml" ]; then
        echo -e "${RED}❌ Please run this script from the n8n directory${NC}"
        echo "Usage: cd n8n && ./setup-demo.sh"
        exit 1
    fi
    
    start_prerequisites
    setup_n8n
    start_n8n
    
    # Small delay before testing
    sleep 3
    
    # Run tests if requested
    if [ "$1" = "--test" ] || [ "$1" = "-t" ]; then
        run_demo_tests
    fi
    
    show_access_info
    
    echo ""
    echo -e "${GREEN}🚀 Setup complete! Press Ctrl+C to stop services.${NC}"
    
    # Keep script running to maintain background processes
    if [ -n "$RAG_PID" ] || [ -n "$DETECTION_PID" ]; then
        wait
    fi
}

# Run main function
main "$@"
