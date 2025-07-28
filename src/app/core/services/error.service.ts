// error.service.ts

import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ErrorService {

  constructor(@Inject(PLATFORM_ID) private platformId: Object) { }

  handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Bilinmeyen bir hata oluştu!';

    if (isPlatformBrowser(this.platformId)) { // Sadece tarayıcıda çalışacak kod
      if (error.error instanceof ErrorEvent) {
        errorMessage = `İstemci Hatası: ${error.error.message}`;
        console.error('İstemci Hatası:', error.error);
      } else {
        // Backend hatası oluştu
        if (error.error && error.error.message) {
          errorMessage = `Sunucu Hatası: ${error.error.message}`;
        } else if (error.status) {
          switch (error.status) {
            case 400:
              errorMessage = `Geçersiz İstek (400): ${error.error?.message || 'İstek verileri geçersiz.'}`;
              break;
            case 401:
              errorMessage = `Yetkilendirme Hatası (401): ${error.error?.message || 'Kimlik doğrulama başarısız oldu.'}`;
              break;
            case 403:
              errorMessage = `Erişim Engellendi (403): ${error.error?.message || 'Bu kaynağa erişim yetkiniz yok.'}`;
              break;
            case 404:
              errorMessage = `Kaynak Bulunamadı (404): ${error.error?.message || 'İstenen kaynak bulunamadı.'}`;
              break;
            case 500:
              errorMessage = `Sunucu Hatası (500): ${error.error?.message || 'Sunucuda beklenmeyen bir hata oluştu.'}`;
              break;
            default:
              errorMessage = `HTTP Hatası (${error.status}): ${error.statusText || 'Bilinmeyen HTTP hatası.'}`;
          }
        } else {
          errorMessage = `Sunucu Hatası: ${error.message}`;
        }
        console.error(`Backend Hatası - Durum: ${error.status}, Mesaj: ${errorMessage}`, error);
      }
    } else {
      // Sunucu tarafında (SSR/SSG) hata oluştuğunda daha basit bir loglama
      errorMessage = `Sunucu Tarafı Hatası: ${error.status} - ${error.message}`;
      console.error('SSR Hatası:', errorMessage, error);
    }

    return throwError(() => new Error(errorMessage));
  }
}
