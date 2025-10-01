// src/app/features/payment/services/payment.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';

import { TokenService } from '../../../core/services/token.service';
import { PaymentResponse } from '../models/payment.models';
import { environment } from "../../../../environments/environment";

export interface PaymentHistoryResponse {
  id: string;
  orderId: string;
  courseId: number;
  courseTitle: string;
  courseImage?: string;
  amount: number;
  currency: string;
  status: 'success' | 'failed' | 'pending' | 'refunded';
  paymentDate: string;
  paymentMethod: string;
  transactionId?: string;
  invoiceUrl?: string;
  refundDate?: string;
  refundReason?: string;
}

export interface PaymentHistoryFilter {
  status?: string;
  dateRange?: string;
  search?: string;
  page?: number;
  size?: number;
}

export interface PagedPaymentHistory {
  content: PaymentHistoryResponse[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  size: number;
}

export interface PaymentStatsResponse {
  successfulPayments: number;
  totalPayments: number;
  totalAmount: number;
  failedPayments: number;
  pendingPayments: number;
  refundedPayments: number;
}

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
   * Belirli bir kurs için ödeme işlemini başlatır
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
            hasSignature: !!response.signature
          });
        }),
        catchError(this.handleError.bind(this))
    );
  }

  /**
   * Kullanıcının ödeme geçmişini getirir
   */
  getPaymentHistory(filter?: PaymentHistoryFilter): Observable<PagedPaymentHistory> {
    console.log('📜 Fetching payment history with filter:', filter);

    const headers = this.getAuthHeaders();
    let params = new HttpParams();

    if (filter) {
      if (filter.status && filter.status !== 'all') {
        params = params.set('status', filter.status);
      }
      if (filter.dateRange && filter.dateRange !== 'all') {
        params = params.set('dateRange', filter.dateRange);
      }
      if (filter.search) {
        params = params.set('search', filter.search);
      }
      if (filter.page !== undefined) {
        params = params.set('page', filter.page.toString());
      }
      if (filter.size !== undefined) {
        params = params.set('size', filter.size.toString());
      }
    }

    return this.http.get<PagedPaymentHistory>(
        `${this.apiUrl}/history`,
        { headers, params }
    ).pipe(
        tap(response => {
          console.log('✅ Payment history loaded:', {
            totalPayments: response.totalElements,
            currentPage: response.currentPage
          });
        }),
        catchError(this.handleError.bind(this))
    );
  }

  /**
   * Kullanıcının ödeme istatistiklerini getirir
   */
  getPaymentStats(): Observable<PaymentStatsResponse> {
    console.log('📊 Fetching payment stats');

    const headers = this.getAuthHeaders();

    return this.http.get<PaymentStatsResponse>(
        `${this.apiUrl}/stats`,
        { headers }
    ).pipe(
        tap(stats => {
          console.log('✅ Payment stats loaded:', stats);
        }),
        catchError(this.handleError.bind(this))
    );
  }

  /**
   * Belirli bir ödemenin detaylarını getirir
   */
  getPaymentDetails(orderId: string): Observable<PaymentHistoryResponse> {
    console.log('🔍 Fetching payment details for:', orderId);

    const headers = this.getAuthHeaders();

    return this.http.get<PaymentHistoryResponse>(
        `${this.apiUrl}/details/${orderId}`,
        { headers }
    ).pipe(
        tap(payment => {
          console.log('✅ Payment details loaded:', payment);
        }),
        catchError(this.handleError.bind(this))
    );
  }

  /**
   * Fatura indir
   */
  downloadInvoice(orderId: string): Observable<Blob> {
    console.log('📄 Downloading invoice for:', orderId);

    const headers = this.getAuthHeaders();

    return this.http.get(
        `${this.apiUrl}/invoice/${orderId}`,
        {
          headers,
          responseType: 'blob'
        }
    ).pipe(
        tap(() => {
          console.log('✅ Invoice downloaded');
        }),
        catchError(this.handleError.bind(this))
    );
  }

  /**
   * Payment verification
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
   * Payment status check
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
   * Client callback gönder
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

  /**
   * Auth headers oluştur
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
   * HTTP hatalarını işler
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('💥 Payment service error:', error);

    let errorMessage = 'Ödeme işlemi başlatılırken bir hata oluştu.';
    let errorCode = 'PAYMENT_ERROR';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Ağ hatası: ${error.error.message}`;
      errorCode = 'NETWORK_ERROR';
    } else {
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
          errorMessage = 'Kurs veya ödeme bulunamadı.';
          errorCode = 'NOT_FOUND';
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
}