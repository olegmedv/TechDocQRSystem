# 🔧 Устранение проблем с подключением к PostgreSQL

## Ошибка: "No such host is known"

Эта ошибка возникает, когда backend пытается подключиться к PostgreSQL до того, как база данных полностью запустится.

### ✅ Исправления уже внесены в код:

1. **Retry логика в Program.cs** - backend будет пытаться подключиться 10 раз с интервалом 5 секунд
2. **Health check для PostgreSQL** - Docker будет ждать готовности БД перед запуском backend
3. **Зависимости в docker-compose** - backend запустится только после готовности PostgreSQL

## 🔍 Диагностика проблем

### 1. Запустите скрипт проверки БД

**Windows:**
```powershell
.\check-db.ps1
```

**Linux/macOS:**
```bash
./check-db.sh
```

### 2. Пошаговая диагностика

#### Шаг 1: Проверьте статус контейнеров
```bash
docker-compose ps
```

Вы должны увидеть:
```
Name                    Command               State           Ports
-------------------------------------------------------------------------
techdoc_postgres     docker-entrypoint.sh postgres   Up      5432/tcp
```

#### Шаг 2: Проверьте логи PostgreSQL
```bash
docker-compose logs postgres
```

Ищите строку:
```
database system is ready to accept connections
```

#### Шаг 3: Проверьте health check PostgreSQL
```bash
docker inspect techdoc_postgres --format='{{.State.Health.Status}}'
```

Должен быть статус: `healthy`

#### Шаг 4: Тест подключения к БД
```bash
docker exec techdoc_postgres pg_isready -U techdoc_user -d techdocqr
```

## 🚀 Решение проблем

### Проблема: PostgreSQL контейнер не запускается

**Решение 1: Проверьте порт 5432**
```bash
# Windows
netstat -an | findstr 5432

# Linux/macOS
netstat -tulpn | grep 5432
```

Если порт занят, остановите локальный PostgreSQL:
```bash
# Linux
sudo systemctl stop postgresql

# Windows (через службы)
net stop postgresql-x64-15
```

**Решение 2: Очистите данные и перезапустите**
```bash
docker-compose down -v
docker-compose up -d postgres
```

### Проблема: PostgreSQL запущен, но backend не подключается

**Решение 1: Проверьте логи backend**
```bash
docker-compose logs backend
```

**Решение 2: Перезапустите с правильной последовательностью**
```bash
# Остановить все
docker-compose down

# Запустить только PostgreSQL и дождаться готовности
docker-compose up -d postgres

# Дождаться healthy статуса
docker inspect techdoc_postgres --format='{{.State.Health.Status}}'

# Запустить backend
docker-compose up -d backend
```

**Решение 3: Ручной запуск с отладкой**
```bash
# Запустить PostgreSQL
docker-compose up -d postgres

# Подождать 30 секунд
sleep 30

# Проверить подключение
docker exec techdoc_postgres psql -U techdoc_user -d techdocqr -c "SELECT 1;"

# Если работает, запустить backend
docker-compose up -d backend
```

### Проблема: "Connection refused" или "Connection timeout"

**Решение 1: Проверьте сеть Docker**
```bash
# Посмотреть сети
docker network ls

# Проверить сеть проекта
docker network inspect techdocqrsystem_default
```

**Решение 2: Пересоздать сеть**
```bash
docker-compose down
docker network prune
docker-compose up -d
```

### Проблема: База данных пуста

**Решение: Проверьте инициализацию**
```bash
# Проверьте что скрипт инициализации выполнился
docker exec techdoc_postgres psql -U techdoc_user -d techdocqr -c "\dt"

# Если таблиц нет, выполните скрипт вручную
docker exec -i techdoc_postgres psql -U techdoc_user -d techdocqr < database/init/01_init.sql
```

## 🛠️ Команды для восстановления

### Полная переустановка системы
```bash
# Остановить и удалить все данные
docker-compose down -v
docker system prune -f

# Пересобрать образы
docker-compose build --no-cache

# Запустить заново
docker-compose up -d
```

### Сброс только базы данных
```bash
# Остановить систему
docker-compose down

# Удалить только volume PostgreSQL
docker volume rm techdocqrsystem_postgres_data

# Запустить заново
docker-compose up -d
```

### Подключение к БД для ручной отладки
```bash
# Подключиться к PostgreSQL
docker exec -it techdoc_postgres psql -U techdoc_user -d techdocqr

# Полезные команды в psql:
\l          # Показать все базы данных
\dt         # Показать таблицы
\d users    # Показать структуру таблицы users
SELECT version();  # Версия PostgreSQL
\q          # Выйти
```

## 📊 Мониторинг состояния

### Проверка в реальном времени
```bash
# Следить за логами всех сервисов
docker-compose logs -f

# Следить только за PostgreSQL
docker-compose logs -f postgres

# Следить только за backend
docker-compose logs -f backend
```

### Автоматическая проверка health check
```bash
# Создать бесконечный цикл проверки
while true; do
  docker inspect techdoc_postgres --format='{{.State.Health.Status}}'
  sleep 5
done
```

## 🎯 Ожидаемое поведение

После исправлений в логах backend вы должны видеть:

```
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://[::]:80
info: Microsoft.Hosting.Lifetime[0]
      Application started. Press Ctrl+C to shut down.
warn: TechDocQRSystem.Api.Program[0]
      Attempting to connect to database (attempt 1/10)
info: TechDocQRSystem.Api.Program[0]
      Database connection successful and schema ensured
```

Вместо ошибки подключения теперь будет retry логика с успешным подключением!