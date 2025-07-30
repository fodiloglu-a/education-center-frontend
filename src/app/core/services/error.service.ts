// error.service.ts

import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError, Observable } from 'rxjs';

export interface ErrorInfo {
  message: string;
  status: number;
  timestamp: Date;
  translationKey?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorService {

  constructor(@Inject(PLATFORM_ID) private platformId: Object) { }

  /**
   * HTTP hatalarını işler ve kullanıcı dostu mesajlar döndürür
   */
  handleError(error: HttpErrorResponse): Observable<never> {
    const errorInfo = this.processError(error);

    if (isPlatformBrowser(this.platformId)) {
      console.error('HTTP Error Details:', {
        status: error.status,
        statusText: error.statusText,
        message: errorInfo.message,
        url: error.url,
        timestamp: errorInfo.timestamp
      });
    }

    return throwError(() => ({
      ...error,
      processedMessage: errorInfo.message,
      translationKey: errorInfo.translationKey,
      timestamp: errorInfo.timestamp
    }));
  }

  /**
   * Hata nesnesini işler ve detaylı bilgi döndürür
   */
  private processError(error: HttpErrorResponse): ErrorInfo {
    let errorMessage = 'Bilinmeyen bir hata oluştu!';
    let translationKey = 'ERROR_GENERIC';

    if (isPlatformBrowser(this.platformId)) {
      if (error.error instanceof ErrorEvent) {
        // İstemci tarafı hata
        errorMessage = `İstemci Hatası: ${error.error.message}`;
        translationKey = 'ERROR_CLIENT';
      } else {
        // Sunucu tarafı hata
        if (error.status === 0) {
          // Network hatası
          errorMessage = 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.';
          translationKey = 'ERROR_NETWORK';
        } else if (error.error && typeof error.error === 'object') {
          // Backend'den gelen structured error
          if (error.error.message) {
            errorMessage = error.error.message;
          } else if (error.error.error) {
            errorMessage = error.error.error;
          }

          // Status code'a göre mesaj belirleme
          errorMessage = this.getStatusMessage(error.status, errorMessage);
          translationKey = this.getTranslationKey(error.status);
        } else if (typeof error.error === 'string') {
          // String error mesajı
          errorMessage = error.error;
          translationKey = this.getTranslationKey(error.status);
        } else {
          // Default status mesajları
          errorMessage = this.getStatusMessage(error.status);
          translationKey = this.getTranslationKey(error.status);
        }
      }
    } else {
      // SSR/SSG durumu
      errorMessage = `Sunucu Tarafı Hatası: ${error.status} - ${error.message}`;
      translationKey = 'ERROR_SERVER_SIDE';
    }

    return {
      message: errorMessage,
      status: error.status || 0,
      timestamp: new Date(),
      translationKey
    };
  }

  /**
   * HTTP status code'una göre mesaj döndürür
   */
  private getStatusMessage(status: number, customMessage?: string): string {
    const baseMessage = customMessage || '';

    switch (status) {
      case 400:
        return customMessage || 'Geçersiz istek. Gönderilen veriler hatalı.';
      case 401:
        return customMessage || 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.';
      case 403:
        return customMessage || 'Bu işlem için yetkiniz bulunmuyor.';
      case 404:
        return customMessage || 'İstenen kaynak bulunamadı.';
      case 409:
        return customMessage || 'Veri çakışması. Bu işlem gerçekleştirilemedi.';
      case 422:
        return customMessage || 'Gönderilen veriler işlenemedi.';
      case 429:
        return customMessage || 'Çok fazla istek gönderildi. Lütfen bekleyin.';
      case 500:
        return customMessage || 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
      case 502:
        return customMessage || 'Sunucu geçici olarak kullanılamıyor.';
      case 503:
        return customMessage || 'Servis geçici olarak kullanılamıyor.';
      case 504:
        return customMessage || 'İstek zaman aşımına uğradı.';
      default:
        return baseMessage || `HTTP ${status}: Beklenmeyen bir hata oluştu.`;
    }
  }

  /**
   * HTTP status code'una göre çeviri anahtarı döndürür
   */
  private getTranslationKey(status: number): string {
    switch (status) {
      case 400:
        return 'ERROR_BAD_REQUEST';
      case 401:
        return 'ERROR_UNAUTHORIZED';
      case 403:
        return 'ERROR_FORBIDDEN';
      case 404:
        return 'ERROR_NOT_FOUND';
      case 409:
        return 'ERROR_CONFLICT';
      case 422:
        return 'ERROR_UNPROCESSABLE_ENTITY';
      case 429:
        return 'ERROR_TOO_MANY_REQUESTS';
      case 500:
        return 'ERROR_INTERNAL_SERVER';
      case 502:
        return 'ERROR_BAD_GATEWAY';
      case 503:
        return 'ERROR_SERVICE_UNAVAILABLE';
      case 504:
        return 'ERROR_GATEWAY_TIMEOUT';
      default:
        return 'ERROR_GENERIC';
    }
  }

  /**
   * Kullanıcı dostu hata mesajı formatlar
   */
  formatUserMessage(error: any): string {
    if (error?.processedMessage) {
      return error.processedMessage;
    }

    if (error?.message) {
      return error.message;
    }

    return 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.';
  }

  /**
   * Hatanın türünü belirler
   */
  getErrorType(error: HttpErrorResponse): 'network' | 'client' | 'server' | 'auth' | 'validation' {
    if (error.status === 0) {
      return 'network';
    } else if (error.status >= 400 && error.status < 500) {
      if (error.status === 401 || error.status === 403) {
        return 'auth';
      } else if (error.status === 422 || error.status === 400) {
        return 'validation';
      }
      return 'client';
    } else if (error.status >= 500) {
      return 'server';
    }
    return 'client';
  }

  /**
   * Yeniden deneme yapılıp yapılamayacağını belirler
   */
  isRetryable(error: HttpErrorResponse): boolean {
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    return retryableStatusCodes.includes(error.status);
  }
}