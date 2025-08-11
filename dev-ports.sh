#!/bin/bash
# Helper script to manage development ports

case "$1" in
  "kill")
    if [ -z "$2" ]; then
      echo "Usage: ./dev-ports.sh kill <port>"
      echo "Example: ./dev-ports.sh kill 3001"
      exit 1
    fi
    echo "Killing processes on port $2..."
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
      # Windows (Git Bash)
      netstat -ano | findstr ":$2" | awk '{print $5}' | while read pid; do
        echo "Killing PID $pid"
        taskkill //PID $pid //F 2>/dev/null
      done
    else
      # Linux/Mac
      lsof -ti:$2 | xargs kill -9 2>/dev/null
    fi
    echo "Done."
    ;;
  "check")
    if [ -z "$2" ]; then
      echo "Usage: ./dev-ports.sh check <port>"
      echo "Example: ./dev-ports.sh check 3001"
      exit 1
    fi
    echo "Checking port $2..."
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
      netstat -ano | findstr ":$2"
    else
      lsof -i:$2
    fi
    ;;
  "status")
    echo "Checking all development ports..."
    echo "=== Port 3001 (API) ==="
    curl -s http://localhost:3001/api/v1/health | head -1 || echo "Not running"
    echo ""
    echo "=== Port 3002 (RAG) ==="
    curl -s http://localhost:3002/api/v1/health | head -1 || echo "Not running"
    echo ""
    ;;
  *)
    echo "Development Port Manager"
    echo "Usage: ./dev-ports.sh [command] [args]"
    echo ""
    echo "Commands:"
    echo "  kill <port>    Kill processes using the specified port"
    echo "  check <port>   Check what's using the specified port"
    echo "  status         Check status of all development services"
    echo ""
    echo "Examples:"
    echo "  ./dev-ports.sh kill 3001     # Kill processes on port 3001"
    echo "  ./dev-ports.sh check 3002    # Check port 3002"
    echo "  ./dev-ports.sh status        # Check all services"
    ;;
esac
