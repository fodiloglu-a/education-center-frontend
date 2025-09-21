import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError } from 'rxjs/operators';
import { ErrorService } from '../services/error.service';
import { TokenService } from '../services/token.service';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';

// Hata sayfasına yönlendirme yapılmayacak URL'ler
const SKIP_ERROR_PAGE_URLS = [
    '/auth/',
    '/public/',
    '/assets/'
];

// Sadece konsola log atılacak, sayfa yönlendirmesi yapılmayacak hatalar
const SILENT_ERROR_ENDPOINTS = [
    '/api/notifications',
    '/api/analytics',
    '/api/health-check'
];

export const ErrorInterceptor: HttpInterceptorFn = (req, next) => {
    const errorService = inject(ErrorService);
    const tokenService = inject(TokenService);
    const router = inject(Router);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            // URL kontrolü - bazı endpoint'ler için hata sayfası gösterme
            const shouldSkipErrorPage = SKIP_ERROR_PAGE_URLS.some(url =>
                req.url.includes(url)
            );

            const isSilentError = SILENT_ERROR_ENDPOINTS.some(endpoint =>
                req.url.includes(endpoint)
            );

            // Silent error ise sadece log at
            if (isSilentError) {
                console.warn('Silent error:', error.status, req.url);
                return errorService.handleError(error);
            }

            // Hata durumuna göre yönlendirme
            if (!shouldSkipErrorPage) {
                switch (error.status) {
                    case 401:
                        // Unauthorized
                        tokenService.signOut();
                        router.navigate(['/401']);
                        break;

                    case 403:
                        // Forbidden
                        router.navigate(['/403']);
                        break;

                    case 404:
                        // Not Found - sadece API istekleri için
                        if (req.url.includes('/api/')) {
                            console.warn('API endpoint not found:', req.url);
                            // Opsiyonel: 404 sayfasına yönlendirmek isteyip istemediğinize karar verin
                            // router.navigate(['/404']);
                        }
                        break;

                    case 500:
                    case 502:
                    case 503:
                    case 504:
                        // Server errors
                        router.navigate(['/500']);
                        break;

                    default:
                        // Diğer hatalar
                        console.error('HTTP Error:', {
                            status: error.status,
                            statusText: error.statusText,
                            message: error.message,
                            url: error.url,
                            error: error.error
                        });
                        break;
                }
            } else {
                // Skip edilen URL'ler için sadece log
                console.log('Skipped error page for:', req.url, error.status);

                // 401 için özel durum - yine de token temizle ve login'e yönlendir
                if (error.status === 401 && !req.url.includes('/auth/')) {
                    tokenService.signOut();
                    router.navigate(['/auth/login']);
                }
            }

            // Hatayı ErrorService'e ilet ve yeniden fırlat
            return errorService.handleError(error);
        })
    );
};