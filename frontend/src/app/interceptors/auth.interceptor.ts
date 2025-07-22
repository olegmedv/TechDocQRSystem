import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  console.log('🌐 AuthInterceptor: Request to:', req.url);

  // Всегда добавляем withCredentials для отправки cookies
  let authReq = req.clone({
    withCredentials: true
  });

  return next(authReq).pipe(
    catchError(error => {
      console.log('🌐 AuthInterceptor: Error:', error.status, 'for URL:', req.url);
      console.log('🌐 AuthInterceptor: isLogoutURL:', req.url.includes('/api/auth/logout'));
      
      if (error.status === 401 && !req.url.includes('/api/auth/logout') && !req.url.includes('/api/auth/login')) {
        console.log('🌐 AuthInterceptor: 401 error - redirecting to login');
        // Token expired or invalid, redirect to login (but not during logout/login)
        router.navigate(['/auth/login']);
      }
      return throwError(() => error);
    })
  );
};