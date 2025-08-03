// src/app/features/payment/payment.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { TokenService } from '../../core/services/token.service'; // TokenService'i import ediyoruz
import { PaymentResponse } from './models/payment.models';
import {environment} from "../../../environments/environment";

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
  initiatePayment(courseId: number): Observable<PaymentResponse> {
    // Oturum açmış kullanıcının JWT token'ını alıyoruz.
    const token = this.tokenService.getAccessToken();

    if (!token) {
      return new Observable(observer => {
        observer.error(new Error('JWT token bulunamadı. Lütfen giriş yapın.'));
        observer.complete();
      });
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.post<PaymentResponse>(`${this.apiUrl}/checkout/${courseId}`, {}, { headers });
  }
}