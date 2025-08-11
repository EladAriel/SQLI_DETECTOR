@echo off
setlocal EnableDelayedExpansion

REM Complete Demo Setup Script for LangChain RAG SQL Injection Detection with N8N (Windows)

echo.
echo 🚀 LangChain RAG SQL Injection Detection - Complete Demo Setup
echo ================================================================
echo.

REM Configuration
set POSTGRES_PORT=5432
set DETECTION_API_PORT=3001
set RAG_API_PORT=3002
set N8N_PORT=5678

REM Colors (Windows compatible)
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "RED=[91m"
set "PURPLE=[95m"
set "NC=[0m"

echo %BLUE%ℹ️  Configuration:%NC%
echo   PostgreSQL Port: %POSTGRES_PORT%
echo   Detection API Port: %DETECTION_API_PORT%
echo   RAG API Port: %RAG_API_PORT%
echo   N8N Port: %N8N_PORT%
echo.

REM Check if in correct directory
if not exist "package.json" (
    echo %RED%❌ Please run this script from the project root directory%NC%
    exit /b 1
)

REM Install dependencies
echo %PURPLE%🔧 Installing dependencies...%NC%
if not exist "node_modules" (
    call npm install
    echo %GREEN%✅ Dependencies installed%NC%
) else (
    echo %BLUE%ℹ️  Dependencies already installed%NC%
)

REM Setup environment
echo %PURPLE%🔧 Setting up environment...%NC%
if not exist ".env" (
    if exist "env.template" (
        copy env.template .env > nul
        echo %GREEN%✅ Environment file created from template%NC%
        echo %YELLOW%⚠️  Please edit .env file with your settings (especially OPENAI_API_KEY)%NC%
    ) else (
        echo %RED%❌ env.template not found%NC%
        exit /b 1
    )
) else (
    echo %BLUE%ℹ️  Environment file already exists%NC%
)

REM Start PostgreSQL
echo %PURPLE%🔧 Starting PostgreSQL database...%NC%
call docker-compose up postgres -d > nul 2>&1
timeout /t 5 > nul
echo %GREEN%✅ PostgreSQL starting...%NC%

REM Initialize database
echo %PURPLE%🔧 Initializing database...%NC%
call npx prisma generate > nul 2>&1
call npx prisma migrate deploy > nul 2>&1
echo %GREEN%✅ Database initialized%NC%

REM Start API services
echo %PURPLE%🔧 Starting API services...%NC%

echo %BLUE%ℹ️  Starting SQL Detection API...%NC%
start /b "" cmd /c "npm run api:start > nul 2>&1"
timeout /t 8 > nul

echo %BLUE%ℹ️  Starting LangChain RAG API...%NC%
start /b "" cmd /c "npm run rag:start > nul 2>&1"
timeout /t 8 > nul

echo %GREEN%✅ API services starting...%NC%

REM Start N8N
echo %PURPLE%🔧 Starting N8N workflow engine...%NC%
cd n8n

if not exist ".env" (
    copy env.template .env > nul
)

if not exist "data" mkdir data
if not exist "data\workflows" mkdir data\workflows
if not exist "data\credentials" mkdir data\credentials

if exist "workflows" (
    copy workflows\*.json data\workflows\ > nul 2>&1
)

call docker-compose -f docker-compose.n8n.yml up -d > nul 2>&1
timeout /t 10 > nul

cd ..
echo %GREEN%✅ N8N starting...%NC%

REM Wait for services to be ready
echo %BLUE%ℹ️  Waiting for services to be ready...%NC%
timeout /t 10 > nul

REM Display access information
echo.
echo %GREEN%🎉 Complete Demo Environment is Ready!%NC%
echo %BLUE%============================================%NC%
echo.
echo %PURPLE%🌐 Service Access URLs:%NC%
echo    Detection API:    http://localhost:%DETECTION_API_PORT%
echo    RAG API:          http://localhost:%RAG_API_PORT%
echo    N8N Interface:    http://localhost:%N8N_PORT%
echo    PostgreSQL:       localhost:%POSTGRES_PORT%
echo.
echo %PURPLE%📚 API Documentation:%NC%
echo    Detection API:    http://localhost:%DETECTION_API_PORT%/api/docs
echo    RAG API:          http://localhost:%RAG_API_PORT%/api/docs
echo.
echo %PURPLE%🔄 N8N Workflow Endpoints:%NC%
echo    Main Workflow:    POST http://localhost:%N8N_PORT%/webhook/sql-detection
echo    Demo Workflow:    POST http://localhost:%N8N_PORT%/webhook/simple-demo
echo.
echo %PURPLE%🧪 Quick Test Commands:%NC%
echo    REM Test SQL injection detection
echo    curl -X POST http://localhost:%N8N_PORT%/webhook/sql-detection ^
echo      -H "Content-Type: application/json" ^
echo      -d "{\"query\": \"SELECT * FROM users WHERE id = '1' OR '1'='1'\"}"
echo.
echo    REM Test safe query
echo    curl -X POST http://localhost:%N8N_PORT%/webhook/simple-demo ^
echo      -H "Content-Type: application/json" ^
echo      -d "{\"query\": \"SELECT name FROM products WHERE category = 'electronics'\"}"
echo.
echo %PURPLE%📋 Management Commands:%NC%
echo    npm run n8n:test     ^& REM Run automated tests
echo    npm run n8n:logs     ^& REM View N8N logs
echo    npm run n8n:stop     ^& REM Stop N8N
echo    npm run n8n:reset    ^& REM Reset N8N
echo.
echo %YELLOW%💡 Next Steps:%NC%
echo    1. Open N8N interface in your browser
echo    2. Workflows should be automatically imported
echo    3. Test the endpoints with the provided curl commands
echo    4. View execution logs and results in N8N
echo    5. Explore the API documentation
echo.
echo %GREEN%🚀 Demo is ready! Press any key to continue or Ctrl+C to exit.%NC%
pause > nul

echo.
echo %BLUE%ℹ️  Demo setup completed. Services are running in the background.%NC%
echo %BLUE%ℹ️  Use the management commands to control the services.%NC%
