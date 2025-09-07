# TechDoc QR System

Technical document management system with QR code generation, OCR processing, and AI analysis.

## System Architecture

- **Backend**: ASP.NET Core 8.0 Web API
- **Frontend**: Angular 17 with ng-zorro-antd
- **Database**: PostgreSQL 15 in Docker
- **OCR**: Tesseract
- **AI**: Google Gemini 1.5 Flash
- **QR Codes**: QRCoder
- **Tunnel**: Cloudflare Tunnel

## Key Features

### 1. Authentication and Authorization
- Registration only with Yandex email (@yandex.ru, @yandex.com)
- Email confirmation before activation
- JWT tokens with 5-minute lifetime
- HTTP-only cookies for security
- Roles: user and administrator

### 2. Document Upload and Processing
- Secure file uploads to local storage
- Automatic OCR with Tesseract (Russian and English)
- AI analysis using Gemini for creating brief descriptions and tags
- Generation of unique access tokens (no direct links)
- Automatic QR code creation for each document

### 3. Search and Indexing
- Full-text search by content, tags, and description
- PostgreSQL indexes for fast search
- Search available to all users, but only owners can upload

### 4. Logging
- Complete logging of all user actions
- Tracking uploads, downloads, QR code generation
- Administrators see logs of all users with filtering
- Regular users see only their own actions

### 5. User Interfaces
- **Main**: Home page with statistics
- **Upload**: File upload with uploaded documents table display
- **Search**: Search documents across the entire database
- **Download**: Manage own documents
- **Logs**: Activity log

## Project Structure

```
TechDocQRSystem/
├── backend/                 # ASP.NET Core API
│   ├── Controllers/         # API controllers
│   ├── Models/             # Data models and DTOs
│   ├── Services/           # Business logic
│   ├── Data/               # DbContext and database configuration
│   └── Middleware/         # Middleware for logging
├── frontend/               # Angular application
│   └── src/app/
│       ├── pages/          # Page components
│       ├── services/       # Angular services
│       ├── models/         # TypeScript models
│       ├── guards/         # Route guards
│       └── interceptors/   # HTTP interceptors
├── database/
│   └── init/               # SQL initialization scripts
├── docker-compose.yml      # Docker composition
├── start-tunnel.ps1        # PowerShell script for Cloudflare
└── uploads/                # Directory for files
```

## Installation and Setup

### Prerequisites
- Docker and Docker Compose
- PowerShell (for tunnel)
- Cloudflared CLI

### Quick Start

1. **Clone the repository:**
```bash
git clone <repository-url>
cd TechDocQRSystem
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env and add your Gemini API key
```

3. **Configure Cloudflare tunnel:**
```powershell
.\start-tunnel.ps1
```

4. **Build project (optional, for verification):**
```powershell
# Windows
.\build.ps1

# Linux/macOS
./build.sh
```

5. **Start the system:**
```bash
docker-compose up -d
```

6. **System access:**
- Frontend: http://localhost:4200
- Backend API: http://localhost:5269
- Database: localhost:5432
- Swagger UI: http://localhost:5269/swagger

### Test Data

The system creates a default administrator:
- **Username**: admin
- **Email**: admin@yandex.ru  
- **Password**: admin123

## Configuration

### Backend (appsettings.json)

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=postgres;Database=techdocqr;..."
  },
  "GeminiApiKey": "",
  "Jwt": {
    "ExpireMinutes": 5
  },
  "Email": {
    "SmtpServer": "smtp.yandex.ru",
    "Port": 587
  }
}
```

### Environment Variables (.env)

```bash
# Gemini API Key (get from https://aistudio.google.com/app/apikey)
GEMINI_API_KEY=your_gemini_api_key_here
```

### Frontend (environment.ts)

```typescript
export const environment = {
  production: false,
  apiUrl: 'https://your-tunnel-url'
};
```

## Database

### Main Tables:
- **users**: Users with roles and email confirmation
- **documents**: Documents with metadata, tokens, and AI analysis
- **activity_logs**: Log of all user actions

### Key Features:
- UUID for all IDs
- Automatic created_at/updated_at
- Full-text search indexes
- Triggers for updating search vectors

## API Endpoints

### Authentication
- `POST /api/auth/register` - Registration
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/confirm-email` - Email confirmation

### Documents
- `POST /api/documents/upload` - Document upload
- `GET /api/documents/my-documents` - My documents
- `GET /api/documents/download/{token}` - Download by token

### Search
- `POST /api/search` - Search documents
- `GET /api/search` - Search (GET parameters)

### Logs
- `GET /api/logs` - Get activity log
- `GET /api/logs/my-stats` - User statistics

## Security

- JWT tokens in HTTP-only cookies
- CORS configured for security
- Files accessible only through API (no direct links)
- Validation for Yandex email only
- Middleware for logging all requests
- Password hashing with BCrypt
- API keys stored in environment variables (not in code)

## Monitoring and Logs

- Structured logging in ASP.NET Core
- Activity logs for all user actions
- IP address and User-Agent tracking
- System usage statistics

## Scaling

The system is ready for horizontal scaling:
- Stateless backend API
- JWT tokens for authentication
- PostgreSQL for concurrent access
- Files can be moved to object storage

## Troubleshooting

### Compilation Errors

1. **QRCode type not found**: Updated to QRCoder 1.5.1 with PngByteQRCode
2. **JWT Token issues**: Check `System.IdentityModel.Tokens.Jwt` version (should be 7.0.3)
3. **LINQ Expression errors**: Fixed by splitting queries in ActivityLogService

### Docker Issues

1. **PostgreSQL won't start**: Check that port 5432 is free
2. **Backend can't connect to DB**: System has retry logic and health checks
3. **"No such host is known"**: Fixed with dependencies and retry logic
4. **Frontend unavailable**: Check CORS settings and tunnel URL

### Tesseract OCR Issues

1. Ensure language packs are installed in Docker container
2. Check access permissions for `/app/uploads` folder

## Development Commands

```bash
# Check database status
.\check-db.ps1          # Windows
./check-db.sh           # Linux/macOS

# Stop system
docker-compose down

# Rebuild containers
docker-compose up -d --build

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# Clear data
docker-compose down -v
```

## License

This project is created for demonstration purposes.