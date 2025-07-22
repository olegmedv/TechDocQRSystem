# Полное пересоздание фронтенда
Write-Host "Recreating frontend project..." -ForegroundColor Green

# Сохраняем исходный код
if (Test-Path "frontend\src") {
    Write-Host "Backing up source code..." -ForegroundColor Yellow
    Copy-Item -Recurse "frontend\src" "frontend_src_backup" -Force
}

# Удаляем старый проект
if (Test-Path "frontend") {
    Write-Host "Removing old frontend..." -ForegroundColor Red
    Remove-Item -Recurse -Force "frontend" -ErrorAction SilentlyContinue
}

# Создаем новый Angular проект
Write-Host "Creating new Angular project..." -ForegroundColor Green
npx @angular/cli@17 new frontend --routing=true --style=css --skip-git=true --package-manager=npm

# Переходим в проект и добавляем ng-zorro
Set-Location "frontend"
Write-Host "Installing ng-zorro..." -ForegroundColor Green
ng add ng-zorro-antd --theme=default --locale=ru_RU --animations=enabled

# Восстанавливаем исходный код
if (Test-Path "..\frontend_src_backup") {
    Write-Host "Restoring source code..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "src" -ErrorAction SilentlyContinue
    Copy-Item -Recurse "..\frontend_src_backup" "src" -Force
    Remove-Item -Recurse -Force "..\frontend_src_backup" -ErrorAction SilentlyContinue
}

Write-Host "Frontend recreated successfully!" -ForegroundColor Green
Write-Host "Run 'npm start' to start development server" -ForegroundColor Cyan