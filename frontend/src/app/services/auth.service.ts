import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private authCheckCompleted = new BehaviorSubject<boolean>(false);
  private tokenExpiryTimer: any;

  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  public authCheckCompleted$ = this.authCheckCompleted.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    console.log('🔐 AuthService: Constructor called');
    this.checkAuthStatus();
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    console.log('🔐 AuthService: login() called with:', credentials.username);
    return this.http.post<AuthResponse>(`${environment.apiUrl}/api/auth/login`, credentials, {
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log('🔐 AuthService: login SUCCESS:', response);
        this.setAuthState(response.user, response.expiresAt, response.token);
      }),
      catchError(error => {
        console.error('🔐 AuthService: login ERROR:', error);
        return throwError(() => error);
      })
    );
  }

  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/api/auth/register`, userData, {
      withCredentials: true
    }).pipe(
      tap(response => {
        this.setAuthState(response.user, response.expiresAt);
      }),
      catchError(error => {
        console.error('Registration error:', error);
        return throwError(() => error);
      })
    );
  }

  logout(): Observable<any> {
    return this.http.post(`${environment.apiUrl}/api/auth/logout`, {}, {
      withCredentials: true
    }).pipe(
      tap(() => {
        this.clearAuthState();
        this.router.navigate(['/auth/login']);
      }),
      catchError(error => {
        // Even if logout fails on server, clear client state
        this.clearAuthState();
        this.router.navigate(['/auth/login']);
        return throwError(() => error);
      })
    );
  }

  refreshToken(): Observable<any> {
    return this.http.post(`${environment.apiUrl}/api/auth/refresh`, {}, {
      withCredentials: true
    }).pipe(
      tap((response: any) => {
        this.scheduleTokenRefresh(response.expiresAt);
      }),
      catchError(error => {
        console.error('Token refresh failed:', error);
        this.clearAuthState();
        this.router.navigate(['/auth/login']);
        return throwError(() => error);
      })
    );
  }

  confirmEmail(token: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}/api/auth/confirm-email?token=${token}`);
  }

  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/api/auth/me`);
  }

  private checkAuthStatus(): void {
    console.log('🔐 AuthService: checkAuthStatus() called');
    const userJson = localStorage.getItem('currentUser');
    const expiresAt = localStorage.getItem('expiresAt');
    
    console.log('🔐 AuthService: localStorage data:', { 
      hasUser: !!userJson, 
      hasExpiresAt: !!expiresAt,
      expiresAt: expiresAt 
    });
    
    if (userJson && expiresAt) {
      const user = JSON.parse(userJson);
      const expiryTime = new Date(expiresAt).getTime();
      const now = new Date().getTime();
      
      console.log('🔐 AuthService: Token timing:', {
        expiryTime: new Date(expiryTime).toISOString(),
        now: new Date(now).toISOString(),
        isExpired: expiryTime <= now,
        timeLeft: expiryTime - now
      });
      
      // Проверяем, не истек ли токен
      if (expiryTime > now) {
        console.log('🔐 AuthService: Token not expired, checking with server...');
        // Проверяем валидность cookie запросом к /api/auth/me
        this.getCurrentUser().subscribe({
          next: (currentUser) => {
            console.log('🔐 AuthService: Server validation SUCCESS:', currentUser);
            this.currentUserSubject.next(currentUser);
            this.isAuthenticatedSubject.next(true);
            this.scheduleTokenRefresh(expiresAt);
            this.authCheckCompleted.next(true);
          },
          error: (error) => {
            console.log('🔐 AuthService: Server validation FAILED:', error);
            // Cookie недействителен, очищаем состояние
            this.clearAuthState();
            this.authCheckCompleted.next(true);
          }
        });
        return;
      } else {
        console.log('🔐 AuthService: Token expired');
      }
    } else {
      console.log('🔐 AuthService: No auth data in localStorage');
    }
    
    // Если данных нет или токен истек - очищаем состояние
    console.log('🔐 AuthService: Clearing auth state');
    this.clearAuthState();
    this.authCheckCompleted.next(true);
  }

  private setAuthState(user: User, expiresAt: string, token?: string): void {
    console.log('🔐 AuthService: setAuthState() called:', { user, expiresAt });
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);
    
    // Сохраняем данные в localStorage для восстановления после перезагрузки
    // Токен не сохраняем, так как он в HTTP-only cookie
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('expiresAt', expiresAt);
    console.log('🔐 AuthService: Data saved to localStorage');
    
    this.scheduleTokenRefresh(expiresAt);
  }

  private clearAuthState(): void {
    console.log('🔐 AuthService: clearAuthState() called');
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    
    // Очищаем localStorage
    localStorage.removeItem('currentUser');
    localStorage.removeItem('expiresAt');
    console.log('🔐 AuthService: localStorage cleared');
    
    if (this.tokenExpiryTimer) {
      clearTimeout(this.tokenExpiryTimer);
    }
  }

  private scheduleTokenRefresh(expiresAt: string): void {
    if (this.tokenExpiryTimer) {
      clearTimeout(this.tokenExpiryTimer);
    }

    const expiryTime = new Date(expiresAt).getTime();
    const currentTime = new Date().getTime();
    const timeUntilExpiry = expiryTime - currentTime;
    
    // Refresh 30 seconds before expiry
    const refreshTime = Math.max(timeUntilExpiry - 30000, 0);

    this.tokenExpiryTimer = setTimeout(() => {
      this.refreshToken().subscribe();
    }, refreshTime);
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public get isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  public isAdmin(): boolean {
    return this.currentUserValue?.role === 'admin' || false;
  }
}