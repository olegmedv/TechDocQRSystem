# Проверяем, установлен ли cloudflared
try {
    $cloudflaredVersion = cloudflared --version
    Write-Host "Cloudflared установлен: $cloudflaredVersion"
} catch {
    Write-Host "Установка cloudflared..."
    winget install Cloudflare.cloudflared
    Write-Host "Cloudflared установлен"
}

# Запускаем tunnel в отдельном процессе
$process = Start-Process -FilePath "cloudflared" -ArgumentList "tunnel --url https://localhost:54137" -NoNewWindow -PassThru -RedirectStandardOutput "cloudflared.log" -RedirectStandardError "cloudflared.error.log"

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
    $logFiles = @("cloudflared.log", "cloudflared.error.log")
    foreach ($logFile in $logFiles) {
        if (Test-Path $logFile) {
            Write-Host "Содержимое файла $($logFile):"
            Get-Content $logFile
            $logs = Get-Content $logFile -Raw
            $urlMatch = $logs | Select-String -Pattern "https://[a-zA-Z0-9-]+\.trycloudflare\.com"
            if ($urlMatch) {
                $tunnelUrl = $urlMatch.Matches[0].Value
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
    Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force
    Remove-Item "cloudflared.log" -ErrorAction SilentlyContinue
    Remove-Item "cloudflared.error.log" -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "Получен URL от Cloudflare Tunnel: $tunnelUrl"

# Обновляем конфигурацию API
$apiConfigPath = "backend\appsettings.Development.json"
if (Test-Path $apiConfigPath) {
    $apiConfig = Get-Content $apiConfigPath | ConvertFrom-Json
    if (-not $apiConfig.PSObject.Properties["TunnelUrl"]) {
        $apiConfig | Add-Member -MemberType NoteProperty -Name "TunnelUrl" -Value $tunnelUrl
    } else {
        $apiConfig.TunnelUrl = $tunnelUrl
    }
    $apiConfig | ConvertTo-Json -Depth 10 | Set-Content $apiConfigPath
    Write-Host "Конфигурация API обновлена с новым URL: $tunnelUrl"
} else {
    Write-Host "Файл конфигурации API не найден: $apiConfigPath"
}

# Обновляем конфигурацию фронтенда
$frontendConfigPath = "frontend\src\environments\environment.ts"
if (Test-Path $frontendConfigPath) {
    $frontendConfig = Get-Content $frontendConfigPath -Raw
    $frontendConfig = $frontendConfig -replace "apiUrl: 'https?://[^']+'", "apiUrl: '$tunnelUrl'"
    $frontendConfig | Set-Content $frontendConfigPath
    Write-Host "Конфигурация фронтенда обновлена с новым URL: $tunnelUrl"
} else {
    Write-Host "Файл конфигурации фронтенда не найден: $frontendConfigPath"
}

# Удаляем временные файлы логов
Remove-Item "cloudflared.log" -ErrorAction SilentlyContinue
Remove-Item "cloudflared.error.log" -ErrorAction SilentlyContinue

Write-Host "`nНастройка завершена. Теперь можно запускать API и фронтенд."
Write-Host "Для остановки tunnel используйте: .\stop-tunnel.ps1"