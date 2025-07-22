#!/bin/bash

# Build script for TechDocQRSystem

echo "Building TechDoc QR System..."

# Build backend
echo ""
echo "Building Backend..."
cd backend
dotnet restore
if [ $? -ne 0 ]; then
    echo "Backend restore failed!"
    exit 1
fi

dotnet build --no-restore
if [ $? -ne 0 ]; then
    echo "Backend build failed!"
    exit 1
fi

echo "Backend build successful!"
cd ..

# Build frontend
echo ""
echo "Building Frontend..."
cd frontend
npm install
if [ $? -ne 0 ]; then
    echo "Frontend npm install failed!"
    exit 1
fi

npm run build
if [ $? -ne 0 ]; then
    echo "Frontend build failed!"
    exit 1
fi

echo "Frontend build successful!"
cd ..

echo ""
echo "All builds completed successfully!"
echo "You can now run 'docker-compose up -d' to start the system."