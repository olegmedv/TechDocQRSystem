# API Testing Guide

## Swagger Documentation

The API documentation is available via Swagger UI when running in development mode:

**URL**: `https://your-tunnel-url/swagger` or `http://localhost:5269/swagger`

## Authentication for API Testing

Since the system uses HTTP-only cookies for authentication, you need to authenticate through the web interface first to test protected endpoints via browser.

### Alternative: Using Bearer Token for API Testing

For direct API testing (Postman, curl, etc.), you can extract the JWT token from the login response and use it as a Bearer token.

## API Endpoints Overview

### Authentication Endpoints

#### POST /api/auth/register
Register a new user with Yandex email.

**Request Body:**
```json
{
  "username": "testuser",
  "email": "testuser@yandex.ru",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Registration successful. Please check your email to confirm your account.",
  "user": {
    "id": "uuid",
    "username": "testuser",
    "email": "testuser@yandex.ru",
    "role": "user"
  },
  "expiresAt": "2024-01-01T12:00:00Z"
}
```

#### POST /api/auth/login
Login with username and password.

**Request Body:**
```json
{
  "username": "testuser",
  "password": "password123"
}
```

#### GET /api/auth/confirm-email?token={token}
Confirm email address with token from email.

#### GET /api/auth/me
Get current user information (requires authentication).

### Document Endpoints

#### POST /api/documents/upload
Upload a document file (requires authentication).

**Content-Type:** `multipart/form-data`
**Form Field:** `file`

#### GET /api/documents/my-documents
Get user's uploaded documents (requires authentication).

#### GET /api/documents/download/{accessToken}
Download document by access token (no authentication required).

### Search Endpoints

#### GET /api/search?query={text}&page={page}&pageSize={size}
Search documents by text (requires authentication).

#### POST /api/search
Search documents with advanced options (requires authentication).

**Request Body:**
```json
{
  "query": "search text",
  "page": 1,
  "pageSize": 10
}
```

### Logs Endpoints

#### GET /api/logs
Get activity logs with optional filters (requires authentication).

**Query Parameters:**
- `username` (optional) - filter by username (admin only)
- `actionType` (optional) - filter by action type
- `fromDate` (optional) - filter from date
- `toDate` (optional) - filter to date
- `page` (default: 1)
- `pageSize` (default: 20)

#### GET /api/logs/my-stats
Get user's activity statistics (requires authentication).

### Test Endpoints

#### GET /api/test/health
System health check (no authentication required).

#### GET /api/test/qr?text={text}
Generate test QR code (no authentication required).

**Query Parameters:**
- `text` (optional) - text to encode in QR code (default: "Test QR Code")

## Error Responses

All endpoints return consistent error responses:

```json
{
  "message": "Error description"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## Testing with curl Examples

### Register User
```bash
curl -X POST "https://your-tunnel-url/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "testuser@yandex.ru", 
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST "https://your-tunnel-url/api/auth/login" \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

### Upload Document
```bash
curl -X POST "https://your-tunnel-url/api/documents/upload" \
  -b cookies.txt \
  -F "file=@/path/to/document.jpg"
```

### Search Documents
```bash
curl -X GET "https://your-tunnel-url/api/search?query=test&page=1&pageSize=10" \
  -b cookies.txt
```

## Notes

- All dates are in ISO 8601 format (UTC)
- File uploads support common image formats (JPEG, PNG, GIF, BMP, TIFF)
- Maximum file size: 50MB (configurable)
- QR codes are returned as base64 encoded PNG images
- Search supports Russian and English text
- Activity logs include IP addresses and user agent information