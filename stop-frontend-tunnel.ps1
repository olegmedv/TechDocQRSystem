# Останавливаем туннель для фронтенда

Write-Host "Остановка Cloudflare tunnel для фронтенда..."

# Проверяем наличие PID файла
if (Test-Path "frontend-tunnel.pid") {
    $pid = Get-Content "frontend-tunnel.pid" -ErrorAction SilentlyContinue
    
    if ($pid) {
        try {
            # Пытаемся найти процесс по PID
            $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
            
            if ($process) {
                Write-Host "Найден процесс туннеля с PID: $pid"
                $process.Kill()
                Write-Host "✅ Процесс туннеля остановлен"
            } else {
                Write-Host "Процесс с PID $pid не найден (возможно, уже остановлен)"
            }
        } catch {
            Write-Host "Ошибка при остановке процесса: $($_.Exception.Message)"
        }
    }
    
    # Удаляем PID файл
    Remove-Item "frontend-tunnel.pid" -ErrorAction SilentlyContinue
    Write-Host "PID файл удален"
} else {
    Write-Host "PID файл не найден"
}

# Дополнительно убиваем все процессы cloudflared (на случай, если что-то пошло не так)
$cloudflaredProcesses = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
if ($cloudflaredProcesses) {
    Write-Host "Найдено $($cloudflaredProcesses.Count) процессов cloudflared"
    Write-Host "ВНИМАНИЕ: Будут остановлены ВСЕ процессы cloudflared (включая бэкенд туннель)"
    $confirmation = Read-Host "Продолжить? (y/N)"
    
    if ($confirmation -eq 'y' -or $confirmation -eq 'Y') {
        foreach ($proc in $cloudflaredProcesses) {
            try {
                $proc.Kill()
                Write-Host "Остановлен процесс cloudflared PID: $($proc.Id)"
            } catch {
                Write-Host "Не удалось остановить процесс PID: $($proc.Id)"
            }
        }
    } else {
        Write-Host "Остановка отменена"
    }
} else {
    Write-Host "Активные процессы cloudflared не найдены"
}

# Очистка временных файлов
Remove-Item "cloudflared-frontend.log" -ErrorAction SilentlyContinue
Remove-Item "cloudflared-frontend.error.log" -ErrorAction SilentlyContinue

Write-Host "Готово!"