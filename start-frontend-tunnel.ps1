# Проверяем, установлен ли cloudflared
try {
    $cloudflaredVersion = cloudflared --version
    Write-Host "Cloudflared установлен: $cloudflaredVersion"
} catch {
    Write-Host "Установка cloudflared..."
    winget install Cloudflare.cloudflared
    Write-Host "Cloudflared установлен"
}

# Проверяем, запущен ли фронтенд на порту 4200
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4200" -TimeoutSec 3 -UseBasicParsing
    Write-Host "Фронтенд запущен на порту 4200"
} catch {
    Write-Host "ВНИМАНИЕ: Фронтенд не запущен на порту 4200!"
    Write-Host "Запустите 'npm start' в папке frontend перед использованием туннеля"
    Write-Host "Продолжаем создание туннеля..."
}

# Запускаем tunnel для фронтенда в отдельном процессе
Write-Host "Запускаем Cloudflare tunnel для фронтенда (порт 4200)..."
$process = Start-Process -FilePath "cloudflared" -ArgumentList "tunnel --url http://localhost:4200" -NoNewWindow -PassThru -RedirectStandardOutput "cloudflared-frontend.log" -RedirectStandardError "cloudflared-frontend.error.log"

# Сохраняем PID процесса
$process.Id | Out-File "frontend-tunnel.pid"
Write-Host "PID туннеля сохранен в frontend-tunnel.pid: $($process.Id)"

# Ждем 10 секунд, чтобы tunnel успел запуститься
Write-Host "Ожидаем запуска tunnel..."
Start-Sleep -Seconds 10

# Читаем логи и ищем URL
$tunnelUrl = $null
$maxAttempts = 30
$attempt = 0

while ($attempt -lt $maxAttempts) {
    Write-Host "`nПопытка $($attempt + 1) из $maxAttempts"
    
    # Проверяем оба файла логов
    $logFiles = @("cloudflared-frontend.log", "cloudflared-frontend.error.log")
    foreach ($logFile in $logFiles) {
        if (Test-Path $logFile) {
            Write-Host "Проверяем файл $($logFile)..."
            $logs = Get-Content $logFile -Raw
            $urlMatch = $logs | Select-String -Pattern "https://[a-zA-Z0-9-]+\.trycloudflare\.com"
            if ($urlMatch) {
                $tunnelUrl = $urlMatch.Matches[0].Value
                Write-Host "Найден URL в файле $($logFile): $tunnelUrl"
                break
            }
        }
    }
    
    if ($tunnelUrl) {
        break
    }
    
    Write-Host "Ожидаем URL в логах..."
    Start-Sleep -Seconds 2
    $attempt++
}

if (-not $tunnelUrl) {
    Write-Host "Не удалось получить URL из логов cloudflared"
    Write-Host "Проверьте логи вручную:"
    Write-Host "- cloudflared-frontend.log"
    Write-Host "- cloudflared-frontend.error.log"
    
    # Останавливаем процесс
    if ($process -and -not $process.HasExited) {
        $process.Kill()
    }
    Remove-Item "frontend-tunnel.pid" -ErrorAction SilentlyContinue
    Remove-Item "cloudflared-frontend.log" -ErrorAction SilentlyContinue
    Remove-Item "cloudflared-frontend.error.log" -ErrorAction SilentlyContinue
    exit 1
}

# Выводим информацию о туннеле
Write-Host "`n========================================="
Write-Host "✅ ТУННЕЛЬ ДЛЯ ФРОНТЕНДА ЗАПУЩЕН"
Write-Host "========================================="
Write-Host "URL фронтенда: $tunnelUrl"
Write-Host "Локальный порт: 4200"
Write-Host "PID процесса: $($process.Id)"
Write-Host "========================================="
Write-Host ""
Write-Host "Инструкции:"
Write-Host "1. Если фронтенд еще не запущен, выполните:"
Write-Host "   cd frontend"
Write-Host "   npm start"
Write-Host ""
Write-Host "2. Откройте в браузере: $tunnelUrl"
Write-Host ""
Write-Host "3. Для остановки туннеля используйте:"
Write-Host "   .\stop-frontend-tunnel.ps1"
Write-Host ""

# Удаляем временные файлы логов
Remove-Item "cloudflared-frontend.log" -ErrorAction SilentlyContinue
Remove-Item "cloudflared-frontend.error.log" -ErrorAction SilentlyContinue

Write-Host "Туннель работает в фоне. Нажмите Ctrl+C для выхода из скрипта (туннель продолжит работать)"
Write-Host "Для полной остановки используйте stop-frontend-tunnel.ps1"