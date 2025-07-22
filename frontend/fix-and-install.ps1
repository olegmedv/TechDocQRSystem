# Скрипт для исправления и установки фронтенда
Write-Host "Fixing frontend dependencies..." -ForegroundColor Green

# Удаление проблемных файлов
if (Test-Path "node_modules") {
    Write-Host "Removing node_modules..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
}

if (Test-Path "package-lock.json") {
    Write-Host "Removing package-lock.json..." -ForegroundColor Yellow
    Remove-Item package-lock.json -ErrorAction SilentlyContinue
}

# Очистка npm cache
Write-Host "Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force

# Установка зависимостей
Write-Host "Installing dependencies..." -ForegroundColor Green
npm install --legacy-peer-deps

# Попытка сборки
Write-Host "Attempting build..." -ForegroundColor Green
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build successful! Starting dev server..." -ForegroundColor Green
    npm start
} else {
    Write-Host "Build failed. Please check errors above." -ForegroundColor Red
}