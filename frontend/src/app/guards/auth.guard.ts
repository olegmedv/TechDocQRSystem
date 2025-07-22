import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { map, filter, take } from 'rxjs/operators';
import { combineLatest } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('🛡️ AuthGuard: called for route:', state.url);

  return combineLatest([
    authService.authCheckCompleted$,
    authService.isAuthenticated$
  ]).pipe(
    filter(([authCheckCompleted]) => {
      console.log('🛡️ AuthGuard: authCheckCompleted:', authCheckCompleted);
      return authCheckCompleted;
    }), // Ждем завершения проверки
    take(1), // Берем только первое значение после завершения проверки
    map(([_, isAuthenticated]) => {
      console.log('🛡️ AuthGuard: isAuthenticated:', isAuthenticated);
      if (isAuthenticated) {
        console.log('🛡️ AuthGuard: ACCESS GRANTED');
        return true;
      } else {
        console.log('🛡️ AuthGuard: ACCESS DENIED - redirecting to login');
        router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
        return false;
      }
    })
  );
};