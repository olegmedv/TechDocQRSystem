# Build script for TechDocQRSystem

Write-Host "Building TechDoc QR System..." -ForegroundColor Green

# Build backend
Write-Host "`nBuilding Backend..." -ForegroundColor Yellow
Set-Location "backend"

Write-Host "Restoring NuGet packages..." -ForegroundColor Cyan
dotnet restore --verbosity minimal
if ($LASTEXITCODE -ne 0) {
    Write-Host "Backend restore failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Compiling backend..." -ForegroundColor Cyan
dotnet build --no-restore --verbosity minimal
if ($LASTEXITCODE -ne 0) {
    Write-Host "Backend build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Backend build successful!" -ForegroundColor Green
Set-Location ".."

# Build frontend
Write-Host "`nBuilding Frontend..." -ForegroundColor Yellow
Set-Location "frontend"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend npm install failed!" -ForegroundColor Red
    exit 1
}

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Frontend build successful!" -ForegroundColor Green
Set-Location ".."

Write-Host "`nAll builds completed successfully!" -ForegroundColor Green
Write-Host "You can now run 'docker-compose up -d' to start the system." -ForegroundColor Cyan