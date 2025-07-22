# Script to check database connectivity

Write-Host "Checking PostgreSQL connectivity..." -ForegroundColor Green

# Check if Docker is running
try {
    docker --version | Out-Null
    Write-Host "✓ Docker is available" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker is not available or not running" -ForegroundColor Red
    exit 1
}

# Check if PostgreSQL container is running
$postgresContainer = docker ps --filter "name=techdoc_postgres" --format "table {{.Names}}\t{{.Status}}" | Select-String "techdoc_postgres"
if ($postgresContainer) {
    Write-Host "✓ PostgreSQL container is running: $postgresContainer" -ForegroundColor Green
} else {
    Write-Host "✗ PostgreSQL container is not running" -ForegroundColor Red
    Write-Host "Try running: docker-compose up -d postgres" -ForegroundColor Yellow
    exit 1
}

# Check if PostgreSQL is responding
Write-Host "Testing PostgreSQL connection..." -ForegroundColor Cyan
try {
    $result = docker exec techdoc_postgres pg_isready -U techdoc_user -d techdocqr
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ PostgreSQL is accepting connections" -ForegroundColor Green
    } else {
        Write-Host "✗ PostgreSQL is not ready" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Cannot check PostgreSQL status" -ForegroundColor Red
}

# Test database connection with actual query
Write-Host "Testing database query..." -ForegroundColor Cyan
try {
    $queryResult = docker exec techdoc_postgres psql -U techdoc_user -d techdocqr -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';" -t
    if ($LASTEXITCODE -eq 0) {
        $tableCount = $queryResult.Trim()
        Write-Host "✓ Database query successful. Tables found: $tableCount" -ForegroundColor Green
        
        if ([int]$tableCount -ge 3) {
            Write-Host "✓ All required tables are present" -ForegroundColor Green
        } else {
            Write-Host "⚠ Some tables might be missing. Expected at least 3 tables." -ForegroundColor Yellow
        }
    } else {
        Write-Host "✗ Database query failed" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Cannot execute database query" -ForegroundColor Red
}

# Check for admin user
Write-Host "Checking for default admin user..." -ForegroundColor Cyan
try {
    $adminCheck = docker exec techdoc_postgres psql -U techdoc_user -d techdocqr -c "SELECT username FROM users WHERE role='admin' LIMIT 1;" -t
    if ($LASTEXITCODE -eq 0) {
        $adminUser = $adminCheck.Trim()
        if ($adminUser) {
            Write-Host "✓ Admin user found: $adminUser" -ForegroundColor Green
        } else {
            Write-Host "⚠ No admin user found" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "⚠ Cannot check admin user" -ForegroundColor Yellow
}

# Show connection details
Write-Host "`nConnection Details:" -ForegroundColor Cyan
Write-Host "Host: localhost" -ForegroundColor White
Write-Host "Port: 5432" -ForegroundColor White
Write-Host "Database: techdocqr" -ForegroundColor White
Write-Host "Username: techdoc_user" -ForegroundColor White
Write-Host "Password: techdoc_password123" -ForegroundColor White

Write-Host "`nTo connect manually:" -ForegroundColor Cyan
Write-Host "docker exec -it techdoc_postgres psql -U techdoc_user -d techdocqr" -ForegroundColor Yellow