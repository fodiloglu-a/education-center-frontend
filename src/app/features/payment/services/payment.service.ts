// src/app/features/payment/payment.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { TokenService } from '../../../core/services/token.service';
import { PaymentResponse } from '../models/payment.models';
import { environment } from "../../../../environments/environment";

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = `${environment.apiUrl}/payment`;

  constructor(
      private http: HttpClient,
      private tokenService: TokenService
  ) { }

  /**
   * 🔧 GÜNCELLENDİ: Belirli bir kurs için ödeme işlemini başlatır ve Liqpay ödeme verilerini backend'den alır.
   * @param courseId Satın alınacak kursun ID'si.
   * @param discountAmount İndirim tutarı (UAH)
   * @returns data ve signature içeren PaymentResponse nesnesini içeren Observable.
   */
  initiatePayment(courseId: number, discountAmount: number): Observable<PaymentResponse> {
    console.log('💳 Initiating payment:', { courseId, discountAmount });

    const headers = this.getAuthHeaders();
    const params = new HttpParams().set('discountAmount', discountAmount.toString());

    return this.http.post<PaymentResponse>(
        `${this.apiUrl}/checkout/${courseId}`,
        null,
        { headers, params }
    ).pipe(
        tap(response => {
          console.log('✅ Payment response received:', {
            hasData: !!response.data,
            hasSignature: !!response.signature,
            dataLength: response.data?.length || 0,
            signatureLength: response.signature?.length || 0
          });
        }),
        catchError(this.handleError.bind(this))
    );
  }

  /**
   * 🔧 YENİ: Debug bilgilerini backend'e gönder
   */
  sendDebugInfo(debugInfo: any): Observable<any> {
    const headers = this.getAuthHeaders();

    console.log('🔧 Sending debug info to backend:', debugInfo);

    return this.http.post<any>(
        `${this.apiUrl}/debug-log`,
        debugInfo,
        { headers }
    ).pipe(
        tap(response => {
          console.log('✅ Debug info sent successfully:', response);
        }),
        catchError(error => {
          console.error('❌ Failed to send debug info:', error);
          return throwError(() => error);
        })
    );
  }

  /**
   * 🔧 YENİ: Payment verification
   */
  verifyPayment(orderId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    const params = new HttpParams().set('orderId', orderId);

    console.log('🔍 Verifying payment for order:', orderId);

    return this.http.get<any>(
        `${this.apiUrl}/verify`,
        { headers, params }
    ).pipe(
        tap(response => {
          console.log('✅ Payment verification result:', response);
        }),
        catchError(this.handleError.bind(this))
    );
  }

  /**
   * 🔧 GÜNCELLENDİ: Auth headers oluştur
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.tokenService.getAccessToken();

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    if (token) {
      return headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  /**
   * 🔧 GÜNCELLENDİ: HTTP hatalarını işler - Daha detaylı error handling
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('💥 Payment service error:', error);

    let errorMessage = 'Ödeme işlemi başlatılırken bir hata oluştu.';
    let errorCode = 'PAYMENT_ERROR';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Ağ hatası: ${error.error.message}`;
      errorCode = 'NETWORK_ERROR';
    } else {
      // Server-side error
      switch (error.status) {
        case 401:
          errorMessage = 'Yetkilendirme hatası. Lütfen tekrar giriş yapın.';
          errorCode = 'UNAUTHORIZED';
          break;
        case 403:
          errorMessage = 'Bu kursa erişim yetkiniz bulunmuyor.';
          errorCode = 'FORBIDDEN';
          break;
        case 404:
          errorMessage = 'Kurs bulunamadı.';
          errorCode = 'COURSE_NOT_FOUND';
          break;
        case 409:
          errorMessage = 'Bu kursu zaten satın aldınız.';
          errorCode = 'ALREADY_ENROLLED';
          break;
        case 422:
          errorMessage = 'Ödeme bilgilerinde hata var. Lütfen kontrol edin.';
          errorCode = 'VALIDATION_ERROR';
          break;
        case 500:
          errorMessage = 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
          errorCode = 'SERVER_ERROR';
          break;
        case 503:
          errorMessage = 'Ödeme sistemi geçici olarak kullanılamıyor.';
          errorCode = 'SERVICE_UNAVAILABLE';
          break;
        default:
          errorMessage = error.error?.message || `Bilinmeyen hata (Kod: ${error.status})`;
          errorCode = `HTTP_${error.status}`;
      }
    }

    // Error object'i oluştur
    const paymentError = {
      message: errorMessage,
      code: errorCode,
      status: error.status,
      timestamp: new Date().toISOString(),
      originalError: error
    };

    console.error('💥 Processed payment error:', paymentError);

    return throwError(() => paymentError);
  }

  /**
   * 🔧 YENİ: Payment status check
   */
  checkPaymentStatus(orderId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    const params = new HttpParams().set('orderId', orderId);

    console.log('📊 Checking payment status for order:', orderId);

    return this.http.get<any>(
        `${this.apiUrl}/status`,
        { headers, params }
    ).pipe(
        tap(response => {
          console.log('📊 Payment status:', response);
        }),
        catchError(this.handleError.bind(this))
    );
  }

  /**
   * 🔧 YENİ: Client callback gönder
   */
  sendClientCallback(callbackData: any): Observable<any> {
    const headers = this.getAuthHeaders();

    console.log('📞 Sending client callback:', callbackData);

    return this.http.post<any>(
        `${this.apiUrl}/client-callback`,
        callbackData,
        { headers }
    ).pipe(
        tap(response => {
          console.log('✅ Client callback response:', response);
        }),
        catchError(this.handleError.bind(this))
    );
  }
}