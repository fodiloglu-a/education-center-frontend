// src/app/features/payment/services/checkout.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import {map, catchError, tap} from 'rxjs/operators';

import { TokenService } from '../../../core/services/token.service';
import {
  Coupon,
  CouponValidationRequest,
  CouponValidationResponse,
  CheckoutSummary,
  TaxCalculation,
  ApiResponse,
  PaginatedResponse,
  DiscountType,
  CourseCategory,
  CouponCreateRequest,
  CouponUpdateRequest,
  CouponSummary,
  CouponErrorCode
} from '../models/coupon.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CheckoutService {
  private paymentApiUrl = `${environment.apiUrl}/payment`;
  private couponApiUrl = `${environment.apiUrl}/coupons`;

  // Checkout state management
  private checkoutSummarySubject = new BehaviorSubject<CheckoutSummary | null>(null);
  public checkoutSummary$ = this.checkoutSummarySubject.asObservable();

  // Applied coupon state
  private appliedCouponSubject = new BehaviorSubject<Coupon | null>(null);
  public appliedCoupon$ = this.appliedCouponSubject.asObservable();

  constructor(
      private http: HttpClient,
      private tokenService: TokenService
  ) {}

  // =================== UKRAINIAN CHECKOUT OPERATIONS ===================

  /**
   * Ukrainian checkout summary oluştur (%20 KDV ile)
   */
  createCheckoutSummary(
      courseId: number,
      userId: number,
      couponCode?: string,
      taxRate: number = 0.20 // Ukrainian VAT rate
  ): Observable<CheckoutSummary> {
    const headers = this.getAuthHeaders();
    let params = new HttpParams()
        .set('courseId', courseId.toString())
        .set('userId', userId.toString())
        .set('taxRate', taxRate.toString());

    if (couponCode) {
      params = params.set('couponCode', couponCode);
    }

    console.log('🇺🇦 Creating Ukrainian checkout summary with 20% VAT:', {
      courseId,
      userId,
      couponCode,
      taxRate
    });

    return this.http.post<CheckoutSummary>(
        `${this.couponApiUrl}/checkout-summary`,
        null,
        { headers, params }
    ).pipe(
        map(summary => {
          console.log('✅ Ukrainian checkout summary received:', summary);
          this.checkoutSummarySubject.next(summary);
          return summary;
        }),
        catchError(this.handleError('createUkrainianCheckoutSummary'))
    );
  }

  /**
   * Ukrainian vergi hesaplaması
   */
  calculateUkrainianTax(
      originalPrice: number,
      discountAmount: number = 0,
      taxRate: number = 0.20
  ): Observable<TaxCalculation> {
    const headers = this.getAuthHeaders();
    const params = new HttpParams()
        .set('originalPrice', originalPrice.toString())
        .set('discountAmount', discountAmount.toString())
        .set('taxRate', taxRate.toString());

    console.log('🇺🇦 Calculating Ukrainian tax (20% VAT):', {
      originalPrice,
      discountAmount,
      taxRate
    });

    return this.http.post<TaxCalculation>(
        `${this.paymentApiUrl}/calculate-tax`,
        null,
        { headers, params }
    ).pipe(
        map(calculation => {
          console.log('✅ Ukrainian tax calculation result:', calculation);
          return calculation;
        }),
        catchError(error => {
          console.error('❌ Ukrainian tax calculation failed:', error);
          return this.createManualTaxCalculation(originalPrice, discountAmount, taxRate);
        })
    );
  }

  /**
   * Manual Ukrainian tax calculation fallback
   */
  private createManualTaxCalculation(
      originalPrice: number,
      discountAmount: number,
      taxRate: number
  ): Observable<TaxCalculation> {
    const subtotal = originalPrice - discountAmount;
    const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
    const finalPrice = Math.round((subtotal + taxAmount) * 100) / 100;

    const calculation: TaxCalculation = {
      originalPrice: Math.round(originalPrice * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      subtotal: Math.round(subtotal * 100) / 100,
      taxRate,
      taxAmount,
      finalPrice
    };

    console.log('🔧 Manual Ukrainian tax calculation:', calculation);
    return new Observable(observer => {
      observer.next(calculation);
      observer.complete();
    });
  }

  // =================== COUPON VALIDATION ===================

  /**
   * Kupon kodunu doğrular ve indirim hesaplar
   */
  validateCoupon(request: CouponValidationRequest): Observable<CouponValidationResponse> {
    const headers = this.getAuthHeaders();

    console.log('🎫 Validating coupon for Ukrainian checkout:', request);

    return this.http.post<CouponValidationResponse>(
        `${this.couponApiUrl}/validate`,
        request,
        { headers }
    ).pipe(
        map(response => {
          console.log('✅ Coupon validation result:', response);
          return response;
        }),
        catchError(this.handleError('validateCoupon'))
    );
  }

  /**
   * Kupon uygular ve kullanım sayısını artırır
   */
  applyCoupon(couponCode: string, courseId: number, userId: number): Observable<Coupon> {
    const headers = this.getAuthHeaders();
    const params = new HttpParams()
        .set('couponCode', couponCode)
        .set('courseId', courseId.toString())
        .set('userId', userId.toString());

    console.log('🎫 Applying coupon for Ukrainian checkout:', {
      couponCode,
      courseId,
      userId
    });

    return this.http.post<Coupon>(
        `${this.couponApiUrl}/apply`,
        null,
        { headers, params }
    ).pipe(
        map(coupon => {
          console.log('✅ Coupon applied successfully:', coupon);
          this.appliedCouponSubject.next(coupon);
          return coupon;
        }),
        catchError(this.handleError('applyCoupon'))
    );
  }

  /**
   * YENİ METOD: Eğitmen için yeni kupon oluşturur.
   */
  /**
   * YENİ METOD: Eğitmen için yeni kupon oluşturur.
   * Verilen instructorId'ye sahip eğitmen için bir kupon oluşturmak üzere API'ye POST isteği gönderir.
   * @param instructorId Kuponu oluşturacak eğitmenin benzersiz kimliği.
   * @param newCoupon Kupon oluşturma isteği için gerekli verileri içeren nesne.
   * @returns Oluşturulan kupon detaylarını içeren bir Observable<Coupon> döner.
   */
  createCouponForInstructor(instructorId: number, newCoupon: CouponCreateRequest): Observable<Coupon> {
    // POST isteği için kimlik doğrulama başlıklarını (headers) alıyoruz.
    const headers = this.getAuthHeaders();

    // İstek yapılacak API URL'sini oluşturuyoruz.
    // URL, couponApiUrl ve eğitmen kimliğini içerir.
    const url = `${this.couponApiUrl}/instructor/${instructorId}`;

    // Loglama yaparak isteğin başladığını belirtiyoruz.
    console.log(`🎫 Eğitmen ID'si ${instructorId} için yeni kupon oluşturma isteği gönderiliyor.`, newCoupon);

    // HttpClient'in post metodunu kullanarak API'ye POST isteği gönderiyoruz.
    // Metod, newCoupon nesnesini istek gövdesi (request body) olarak gönderir.
    return this.http.post<Coupon>(url, newCoupon, { headers }).pipe(
        // map operatörü ile başarılı yanıtı (response) işliyoruz.
        map(coupon => {
          console.log('✅ Kupon başarıyla oluşturuldu:', coupon);
          return coupon;
        }),
        // catchError operatörü ile hata durumlarını yönetiyoruz.
        // Hata durumunda, genel hata işleyici metodumuzu (handleError) çağırıyoruz.
        catchError(this.handleError('createCouponForInstructor'))
    );
  }
  /**
   * Ukrainian payment initiation
   */
  initiateUkrainianPayment(courseId: number, discountAmount: number = 0): Observable<any> {
    const headers = this.getAuthHeaders();
    const params = new HttpParams().set('discountAmount', discountAmount.toString());

    console.log('💳 Initiating Ukrainian payment with VAT:', {
      courseId,
      discountAmount
    });

    return this.http.post<any>(
        `${this.paymentApiUrl}/checkout/${courseId}`,
        null,
        { headers, params }
    ).pipe(
        map(response => {
          console.log('✅ Ukrainian payment initiated:', response);
          return response;
        }),
        catchError(this.handleError('initiateUkrainianPayment'))
    );
  }

  // =================== STATE MANAGEMENT ===================

  /**
   * Checkout state'ini temizle
   */
  clearCheckoutState(): void {
    console.log('🧹 Clearing Ukrainian checkout state');
    this.checkoutSummarySubject.next(null);
    this.appliedCouponSubject.next(null);
  }

  /**
   * Uygulanan kuponu temizle
   */
  clearAppliedCoupon(): void {
    console.log('🧹 Clearing applied coupon');
    this.appliedCouponSubject.next(null);
  }

  /**
   * Mevcut checkout summary'i al
   */
  getCurrentCheckoutSummary(): CheckoutSummary | null {
    return this.checkoutSummarySubject.value;
  }

  /**
   * Mevcut uygulanan kuponu al
   */
  getCurrentAppliedCoupon(): Coupon | null {
    return this.appliedCouponSubject.value;
  }

  // =================== UTILITY METHODS ===================

  /**
   * Ukrainian currency formatting
   */
  formatUkrainianCurrency(amount: number): string {
    try {
      return new Intl.NumberFormat('uk-UA', {
        style: 'currency',
        currency: 'UAH',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      return `${amount.toFixed(2)} ₴`;
    }
  }

  /**
   * Ukrainian VAT percentage formatting
   */
  formatUkrainianVATPercentage(rate: number): string {
    return `${(rate * 100).toFixed(1)}%`;
  }

  /**
   * Validate Ukrainian amount
   */
  isValidUkrainianAmount(amount: number): boolean {
    return amount > 0 && amount <= 999999.99 && Number.isFinite(amount);
  }

  // =================== HELPER METHODS ===================

  /**
   * Auth headers oluştur
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.tokenService.getAccessToken();

    if (!token) {
      throw new Error('No authentication token available for Ukrainian checkout');
    }

    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept-Language': 'uk-UA'
    });
  }

  /**
   * Error handler
   */
  private handleError(operation: string) {
    return (error: any): Observable<never> => {
      console.error(`🇺🇦 Ukrainian ${operation} failed:`, error);

      // Kullanıcı dostu hata mesajları
      let userMessage = 'An error occurred in Ukrainian checkout';

      if (error.status === 401) {
        userMessage = 'Authentication required for Ukrainian checkout';
      } else if (error.status === 403) {
        userMessage = 'Access denied for Ukrainian checkout';
      } else if (error.status === 404) {
        userMessage = 'Ukrainian checkout resource not found';
      } else if (error.status === 400 && error.error?.code) {
        userMessage = this.getUkrainianErrorMessage(error.error.code);
      }

      return throwError({
        operation,
        message: userMessage,
        originalError: error,
        country: 'Ukraine',
        currency: 'UAH',
        vatRate: '20%'
      });
    };
  }

  /**
   * Ukrainian error code'a göre kullanıcı dostu mesaj döndürür
   */
  private getUkrainianErrorMessage(errorCode: string): string {
    const errorMessages: { [key: string]: string } = {
      [CouponErrorCode.COUPON_NOT_FOUND]: 'Купон не знайдено',
      [CouponErrorCode.COUPON_EXPIRED]: 'Термін дії купона закінчився',
      [CouponErrorCode.USAGE_LIMIT_REACHED]: 'Досягнуто ліміт використання купона',
      [CouponErrorCode.NOT_APPLICABLE]: 'Купон не застосовується до цього курсу',
      [CouponErrorCode.MINIMUM_AMOUNT_NOT_MET]: 'Не досягнуто мінімальної суми',
      [CouponErrorCode.COUPON_INACTIVE]: 'Купон неактивний',
      [CouponErrorCode.INVALID_INSTRUCTOR]: 'Недійсний інструктор для цього купона'
    };

    return errorMessages[errorCode] || 'Невідома помилка';
  }

  /**
   * Belirli bir eğitmenin kuponlarını listeler.
   * @param instructorId Kuponları getirilecek eğitmenin kimliği.
   * @returns Kupon listesini içeren bir Observable<Coupon[]>.
   */
  getCouponsByInstructor(instructorId: number): Observable<Coupon[]> {
    const headers = this.getAuthHeaders();
    const url = `${this.couponApiUrl}/instructor/coupons/${instructorId}`;

    console.log(`🎫 Eğitmen ID'si ${instructorId} için kuponlar listeleniyor.`);

    return this.http.get<Coupon[]>(url, { headers }).pipe(
        map(coupons => {
          console.log('✅ Kuponlar başarıyla listelendi:', coupons);
          return coupons;
        }),
        catchError(this.handleError('getCouponsByInstructor'))
    );
  }

  /**
   * Belirli bir kuponu siler.
   * @param id Silinecek kuponun kimliği.
   * @returns Başarılı silme işlemini gösteren bir Observable<void>.
   */
  deleteCoupon(id: number): Observable<void> {
    const headers = this.getAuthHeaders();
    const url = `${this.couponApiUrl}/${id}`;

    console.log(`❌ Kupon ID'si ${id} siliniyor.`);

    return this.http.delete<void>(url, { headers }).pipe(
        tap(() => console.log(`✅ Kupon ID'si ${id} başarıyla silindi.`)),
        catchError(this.handleError('deleteCoupon'))
    );
  }
}