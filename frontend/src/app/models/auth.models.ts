export interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  emailConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  expiresAt: string;
  token?: string;
}