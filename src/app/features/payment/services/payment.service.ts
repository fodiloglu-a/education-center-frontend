// src/app/features/payment/payment.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

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
   * Belirli bir kurs için ödeme işlemini başlatır ve Liqpay ödeme verilerini backend'den alır.
   * @param courseId Satın alınacak kursun ID'si.
   * @returns data ve signature içeren PaymentResponse nesnesini içeren Observable.
   */
  initiatePayment(courseId: number, discountAmount: number): Observable<PaymentResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    const params = {
      discountAmount: discountAmount.toString()
    };

    return this.http.post<PaymentResponse>(
        `${this.apiUrl}/checkout/${courseId}`,
        null,
        { headers, params }
    );
  }
  /**
   * HTTP hatalarını işler
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Ödeme işlemi başlatılırken bir hata oluştu.';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Hata: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 401:
          errorMessage = 'Yetkilendirme hatası. Lütfen tekrar giriş yapın.';
          break;
        case 403:
          errorMessage = 'Bu kursa erişim yetkiniz bulunmuyor.';
          break;
        case 404:
          errorMessage = 'Kurs bulunamadı.';
          break;
        case 409:
          errorMessage = 'Bu kursu zaten satın aldınız.';
          break;
        case 500:
          errorMessage = 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
          break;
        default:
          errorMessage = error.error?.message || `Hata kodu: ${error.status}`;
      }
    }

    return throwError(() => new Error(errorMessage));
  }
}