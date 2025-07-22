export interface Document {
  id: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  accessLink: string;
  qrCodeBase64: string;
  summary?: string;
  tags: string[];
  createdAt: string;
  downloadCount: number;
  qrGenerationCount: number;
  lastAccessedAt?: string;
}

export interface SearchRequest {
  query: string;
  page: number;
  pageSize: number;
}

export interface SearchResult {
  id: string;
  filename: string;
  summary?: string;
  tags: string[];
  accessLink: string;
  qrCodeBase64: string;
  createdAt: string;
  userAccessCount: number;
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface ActivityLog {
  id: string;
  actionType: string;
  documentName?: string;
  username: string;
  createdAt: string;
  details?: any;
}

export interface ActivityLogFilter {
  username?: string;
  actionType?: string;
  fromDate?: string;
  toDate?: string;
  page: number;
  pageSize: number;
}

export interface ActivityLogsResponse {
  logs: ActivityLog[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}