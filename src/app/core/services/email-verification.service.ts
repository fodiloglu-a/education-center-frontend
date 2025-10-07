// email-verification.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  VerificationResponse,
  ResendVerificationRequest,
  ResendVerificationResponse,
  EmailVerificationStatus
} from '../../features/auth/models/auth.models';

/**
 * Email Verification Service
 * Email doğrulama işlemlerini yönetir
 * - Token ile email doğrulama
 * - Doğrulama emailini yeniden gönderme
 * - Doğrulama durumu kontrolü
 */
@Injectable({
  providedIn: 'root'
})
export class EmailVerificationService {

  private readonly API_URL = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) { }

  /**
   * Email doğrulama token'ını backend'e gönderir ve doğrulama işlemini yapar
   * @param token Email doğrulama token'ı (URL'den alınır)
   * @returns Observable<VerificationResponse> Doğrulama sonucu
   *
   * Kullanım:
   * verifyEmail('abc123-xyz789').subscribe(
   *   response => console.log(response.message),
   *   error => console.error(error)
   * );
   */
  verifyEmail(token: string): Observable<VerificationResponse> {
    const params = new HttpParams().set('token', token);

    return this.http.get<VerificationResponse>(`${this.API_URL}/verify-email`, { params })
        .pipe(
            map(response => {
              console.log('✅ Email doğrulama başarılı:', response);
              return response;
            }),
            catchError(error => {
              console.error('❌ Email doğrulama hatası:', error);
              return throwError(() => this.handleError(error));
            })
        );
  }

  /**
   * Doğrulama emailini yeniden gönderir
   * @param email Kullanıcının email adresi
   * @returns Observable<ResendVerificationResponse> Yeniden gönderme sonucu
   *
   * Not: 2 dakika cooldown süresi vardır (backend tarafında kontrol edilir)
   *
   * Kullanım:
   * resendVerificationEmail('user@example.com').subscribe(
   *   response => console.log(response.message),
   *   error => console.error(error)
   * );
   */
  resendVerificationEmail(email: string): Observable<ResendVerificationResponse> {
    const request: ResendVerificationRequest = { email };

    return this.http.post<ResendVerificationResponse>(`${this.API_URL}/resend-verification`, request)
        .pipe(
            map(response => {
              console.log('✅ Email yeniden gönderildi:', response);
              return response;
            }),
            catchError(error => {
              console.error('❌ Email yeniden gönderme hatası:', error);
              return throwError(() => this.handleError(error));
            })
        );
  }

  /**
   * Kullanıcının email doğrulama durumunu kontrol eder
   * @param userId Kullanıcı ID'si
   * @returns Observable<boolean> Email doğrulanmış mı?
   *
   * Not: Bu endpoint henüz backend'de yok, gerekirse eklenebilir
   * Şimdilik UserProfile'dan isEmailVerified alanını kullanabilirsiniz
   */
  checkVerificationStatus(userId: number): Observable<boolean> {
    // Bu endpoint opsiyoneldir, gerekirse backend'de oluşturulabilir
    // Şimdilik UserProfile'dan isEmailVerified alanını kullanın
    console.warn('checkVerificationStatus: Bu method henüz implement edilmedi');
    return throwError(() => new Error('Method not implemented yet'));
  }

  /**
   * Token'ın geçerli olup olmadığını kontrol eder (client-side basic check)
   * @param token Kontrol edilecek token
   * @returns boolean Token geçerli format mı?
   */
  isValidTokenFormat(token: string): boolean {
    // UUID v4 formatı kontrolü (36 karakter, tire'lerle)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return token != null && token.trim() !== '' && uuidRegex.test(token);
  }

  /**
   * Email adresinin geçerli olup olmadığını kontrol eder
   * @param email Kontrol edilecek email adresi
   * @returns boolean Email geçerli format mı?
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return email != null && email.trim() !== '' && emailRegex.test(email);
  }

  /**
   * Local storage'dan son email gönderim zamanını alır
   * Rate limiting için kullanılır (2 dakika cooldown)
   * @param email Email adresi
   * @returns Date | null Son gönderim zamanı veya null
   */
  getLastEmailSentTime(email: string): Date | null {
    const key = `email_verification_last_sent_${email}`;
    const timestamp = localStorage.getItem(key);
    return timestamp ? new Date(timestamp) : null;
  }

  /**
   * Local storage'a son email gönderim zamanını kaydeder
   * @param email Email adresi
   */
  setLastEmailSentTime(email: string): void {
    const key = `email_verification_last_sent_${email}`;
    localStorage.setItem(key, new Date().toISOString());
  }

  /**
   * Email yeniden gönderim için bekleme süresini hesaplar
   * @param email Email adresi
   * @returns number Kalan saniye (0 ise gönderilebilir)
   */
  getResendCooldownSeconds(email: string): number {
    const lastSent = this.getLastEmailSentTime(email);
    if (!lastSent) return 0;

    const now = new Date();
    const cooldownMs = 2 * 60 * 1000; // 2 dakika
    const elapsedMs = now.getTime() - lastSent.getTime();
    const remainingMs = cooldownMs - elapsedMs;

    return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
  }

  /**
   * Email yeniden gönderilebilir mi kontrol eder
   * @param email Email adresi
   * @returns boolean Gönderilebilir mi?
   */
  canResendEmail(email: string): boolean {
    return this.getResendCooldownSeconds(email) === 0;
  }

  /**
   * HTTP hata mesajlarını kullanıcı dostu formata çevirir
   * @param error HTTP hatası
   * @returns string Kullanıcı dostu hata mesajı
   */
  private handleError(error: any): Error {
    let errorMessage = 'Bir hata oluştu';

    if (error.error && error.error.message) {
      errorMessage = error.error.message;
    } else if (error.status === 0) {
      errorMessage = 'Sunucuya bağlanılamıyor. İnternet bağlantınızı kontrol edin.';
    } else if (error.status === 400) {
      errorMessage = error.error?.message || 'Geçersiz istek';
    } else if (error.status === 404) {
      errorMessage = 'Kullanıcı bulunamadı';
    } else if (error.status === 429) {
      errorMessage = 'Çok fazla istek gönderildi. Lütfen bekleyin.';
    } else if (error.status === 500) {
      errorMessage = 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
    }

    return new Error(errorMessage);
  }
}