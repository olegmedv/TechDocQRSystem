#!/bin/bash

# Script to check database connectivity

echo "🔍 Checking PostgreSQL connectivity..."

# Check if Docker is running
if command -v docker &> /dev/null; then
    echo "✓ Docker is available"
else
    echo "✗ Docker is not available or not running"
    exit 1
fi

# Check if PostgreSQL container is running
if docker ps --filter "name=techdoc_postgres" --format "table {{.Names}}\t{{.Status}}" | grep -q "techdoc_postgres"; then
    echo "✓ PostgreSQL container is running"
else
    echo "✗ PostgreSQL container is not running"
    echo "💡 Try running: docker-compose up -d postgres"
    exit 1
fi

# Check if PostgreSQL is responding
echo "🔗 Testing PostgreSQL connection..."
if docker exec techdoc_postgres pg_isready -U techdoc_user -d techdocqr > /dev/null 2>&1; then
    echo "✓ PostgreSQL is accepting connections"
else
    echo "✗ PostgreSQL is not ready"
fi

# Test database connection with actual query
echo "📊 Testing database query..."
table_count=$(docker exec techdoc_postgres psql -U techdoc_user -d techdocqr -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';" -t 2>/dev/null | tr -d ' ')

if [ $? -eq 0 ] && [ -n "$table_count" ]; then
    echo "✓ Database query successful. Tables found: $table_count"
    
    if [ "$table_count" -ge 3 ]; then
        echo "✓ All required tables are present"
    else
        echo "⚠ Some tables might be missing. Expected at least 3 tables."
    fi
else
    echo "✗ Database query failed"
fi

# Check for admin user
echo "👤 Checking for default admin user..."
admin_user=$(docker exec techdoc_postgres psql -U techdoc_user -d techdocqr -c "SELECT username FROM users WHERE role='admin' LIMIT 1;" -t 2>/dev/null | tr -d ' ')

if [ $? -eq 0 ] && [ -n "$admin_user" ]; then
    echo "✓ Admin user found: $admin_user"
else
    echo "⚠ No admin user found or cannot check"
fi

# Show connection details
echo ""
echo "📋 Connection Details:"
echo "Host: localhost"
echo "Port: 5432"
echo "Database: techdocqr"
echo "Username: techdoc_user"
echo "Password: techdoc_password123"

echo ""
echo "🔧 To connect manually:"
echo "docker exec -it techdoc_postgres psql -U techdoc_user -d techdocqr"