// auth.interceptor.ts

import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auth.service';

// Token refresh durumu için global state
let isRefreshing = false;
let refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

/**
 * Auth Interceptor - JWT token'ını otomatik olarak ekler ve token refresh işlemlerini yönetir
 */
export const AuthInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
  const tokenService = inject(TokenService);
  const authService = inject(AuthService);

  // Auth endpoint'leri için token eklemeye gerek yok
  if (isAuthEndpoint(req.url)) {
    return next(req);
  }

  // Token ekle
  const token = tokenService.getAccessToken();
  const authReq = addTokenToRequest(req, token);

  return next(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // 401 hatası ve token varsa refresh dene
        if (error.status === 401 && token && !isAuthEndpoint(req.url)) {
          return handle401Error(authReq, next, tokenService, authService);
        }

        return throwError(() => error);
      })
  );
};

/**
 * Request'e token ekler
 */
function addTokenToRequest(request: HttpRequest<any>, token: string | null): HttpRequest<any> {
  if (token) {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }
  return request;
}

/**
 * Auth endpoint'i olup olmadığını kontrol eder
 */
function isAuthEndpoint(url: string): boolean {
  const authEndpoints = [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email'
  ];

  return authEndpoints.some(endpoint => url.includes(endpoint));
}

/**
 * 401 hatasını handle eder ve token refresh yapar
 */
function handle401Error(
    request: HttpRequest<any>,
    next: HttpHandlerFn,
    tokenService: TokenService,
    authService: AuthService
): Observable<HttpEvent<any>> {

  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    const refreshToken = tokenService.getRefreshToken();

    if (!refreshToken) {
      // Refresh token yok, logout yap
      authService.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    return authService.refreshToken().pipe(
        switchMap((response) => {
          isRefreshing = false;
          refreshTokenSubject.next(response.accessToken);

          // Yeni token ile request'i tekrar gönder
          const newAuthReq = addTokenToRequest(request, response.accessToken);
          return next(newAuthReq);
        }),
        catchError((error) => {
          isRefreshing = false;
          refreshTokenSubject.next(null);

          // Refresh başarısız, logout yap
          authService.logout();
          return throwError(() => error);
        })
    );
  } else {
    // Zaten refresh yapılıyor, sonucunu bekle
    return refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(token => {
          const newAuthReq = addTokenToRequest(request, token);
          return next(newAuthReq);
        })
    );
  }
}