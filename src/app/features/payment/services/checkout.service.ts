// src/app/features/payment/services/checkout.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

import { TokenService } from '../../../core/services/token.service';
import {
  Coupon,
  CouponValidationRequest,
  CouponValidationResponse,
  CheckoutSummary,
  TaxCalculation,
  CouponCreateRequest,
  CouponErrorCode
} from '../models/coupon.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CheckoutService {
  private readonly paymentApiUrl = `${environment.apiUrl}/payment`;
  private readonly couponApiUrl = `${environment.apiUrl}/coupons`;
  private readonly UKRAINIAN_VAT_RATE = 0.20;

  // State management
  private readonly checkoutSummarySubject = new BehaviorSubject<CheckoutSummary | null>(null);
  public readonly checkoutSummary$ = this.checkoutSummarySubject.asObservable();

  private readonly appliedCouponSubject = new BehaviorSubject<Coupon | null>(null);
  public readonly appliedCoupon$ = this.appliedCouponSubject.asObservable();

  constructor(
      private readonly http: HttpClient,
      private readonly tokenService: TokenService
  ) {}

  // =================== CHECKOUT OPERATIONS ===================

  /**
   * Checkout summary oluşturur (Ukrainian VAT %20)
   */
  createCheckoutSummary(
      courseId: number,
      userId: number,
      couponCode?: string,
      taxRate: number = this.UKRAINIAN_VAT_RATE
  ): Observable<CheckoutSummary> {
    if (!this.isValidId(courseId) || !this.isValidId(userId)) {
      return throwError(() => new Error('Invalid courseId or userId'));
    }

    if (taxRate < 0 || taxRate > 1) {
      return throwError(() => new Error('Invalid tax rate'));
    }

    const headers = this.getAuthHeaders();
    let params = new HttpParams()
        .set('courseId', courseId.toString())
        .set('userId', userId.toString())
        .set('taxRate', taxRate.toString());

    if (couponCode?.trim()) {
      params = params.set('couponCode', couponCode.trim());
    }

    console.log('Creating checkout summary:', { courseId, userId, couponCode, taxRate });

    return this.http.post<CheckoutSummary>(
        `${this.couponApiUrl}/checkout-summary`,
        null,
        { headers, params }
    ).pipe(
        tap(summary => {
          console.log('Checkout summary created:', summary);
          this.checkoutSummarySubject.next(summary);
        }),
        catchError(this.handleError('createCheckoutSummary'))
    );
  }

  /**
   * Vergi hesaplaması
   */
  calculateTax(
      originalPrice: number,
      discountAmount: number = 0,
      taxRate: number = this.UKRAINIAN_VAT_RATE
  ): Observable<TaxCalculation> {
    if (!this.isValidUkrainianAmount(originalPrice)) {
      return throwError(() => new Error('Invalid original price'));
    }

    if (discountAmount < 0 || discountAmount > originalPrice) {
      return throwError(() => new Error('Invalid discount amount'));
    }

    const headers = this.getAuthHeaders();
    const params = new HttpParams()
        .set('originalPrice', originalPrice.toString())
        .set('discountAmount', discountAmount.toString())
        .set('taxRate', taxRate.toString());

    console.log('Calculating tax:', { originalPrice, discountAmount, taxRate });

    return this.http.post<TaxCalculation>(
        `${this.couponApiUrl}/calculate-tax`,
        null,
        { headers, params }
    ).pipe(
        tap(calculation => console.log('Tax calculated:', calculation)),
        catchError(() => this.createManualTaxCalculation(originalPrice, discountAmount, taxRate))
    );
  }

  /**
   * Ödeme başlatma
   */
  initiatePayment(courseId: number, discountAmount: number = 0): Observable<any> {
    if (!this.isValidId(courseId)) {
      return throwError(() => new Error('Invalid courseId'));
    }

    if (discountAmount < 0) {
      return throwError(() => new Error('Invalid discount amount'));
    }

    const headers = this.getAuthHeaders();
    const params = new HttpParams().set('discountAmount', discountAmount.toString());

    console.log('Initiating payment:', { courseId, discountAmount });

    return this.http.post<any>(
        `${this.paymentApiUrl}/checkout/${courseId}`,
        null,
        { headers, params }
    ).pipe(
        tap(response => console.log('Payment initiated:', response)),
        catchError(this.handleError('initiatePayment'))
    );
  }

  // =================== COUPON OPERATIONS ===================

  /**
   * Kupon doğrulama
   */
  validateCoupon(request: CouponValidationRequest): Observable<CouponValidationResponse> {
    if (!this.isValidCouponValidationRequest(request)) {
      return throwError(() => new Error('Invalid coupon validation request'));
    }

    const headers = this.getAuthHeaders();

    console.log('Validating coupon:', request);

    return this.http.post<CouponValidationResponse>(
        `${this.couponApiUrl}/validate`,
        request,
        { headers }
    ).pipe(
        tap(response => console.log('Coupon validation result:', response)),
        catchError(this.handleError('validateCoupon'))
    );
  }

  /**
   * Kupon uygulama
   */
  applyCoupon(couponCode: string, courseId: number, userId: number): Observable<Coupon> {
    if (!couponCode?.trim()) {
      return throwError(() => new Error('Coupon code is required'));
    }

    if (!this.isValidId(courseId) || !this.isValidId(userId)) {
      return throwError(() => new Error('Invalid courseId or userId'));
    }

    const headers = this.getAuthHeaders();
    const params = new HttpParams()
        .set('couponCode', couponCode.trim())
        .set('courseId', courseId.toString())
        .set('userId', userId.toString());

    console.log('Applying coupon:', { couponCode, courseId, userId });

    return this.http.post<Coupon>(
        `${this.couponApiUrl}/apply`,
        null,
        { headers, params }
    ).pipe(
        tap(coupon => {
          console.log('Coupon applied:', coupon);
          this.appliedCouponSubject.next(coupon);
        }),
        catchError(this.handleError('applyCoupon'))
    );
  }

  /**
   * Eğitmen için kupon oluşturma
   */
  createCouponForInstructor(instructorId: number, newCoupon: CouponCreateRequest): Observable<Coupon> {
    if (!this.isValidId(instructorId)) {
      return throwError(() => new Error('Invalid instructorId'));
    }

    if (!this.isValidCouponCreateRequest(newCoupon)) {
      return throwError(() => new Error('Invalid coupon create request'));
    }

    const headers = this.getAuthHeaders();
    const url = `${this.couponApiUrl}/instructor/${instructorId}`;

    console.log(`Creating coupon for instructor ${instructorId}:`, newCoupon);

    return this.http.post<Coupon>(url, newCoupon, { headers }).pipe(
        tap(coupon => console.log('Coupon created:', coupon)),
        catchError(this.handleError('createCouponForInstructor'))
    );
  }

  /**
   * Eğitmenin kuponlarını listele
   */
  getCouponsByInstructor(instructorId: number): Observable<Coupon[]> {
    if (!this.isValidId(instructorId)) {
      return throwError(() => new Error('Invalid instructorId'));
    }

    const headers = this.getAuthHeaders();
    const url = `${this.couponApiUrl}/instructor/${instructorId}/list`;

    console.log(`Fetching coupons for instructor ${instructorId}`);

    return this.http.get<Coupon[]>(url, { headers }).pipe(
        tap(coupons => console.log('Coupons fetched:', coupons)),
        catchError(this.handleError('getCouponsByInstructor'))
    );
  }

  /**
   * Kupon silme
   */
  deleteCoupon(id: number): Observable<void> {
    if (!this.isValidId(id)) {
      return throwError(() => new Error('Invalid coupon id'));
    }

    const headers = this.getAuthHeaders();
    const url = `${this.couponApiUrl}/${id}`;

    console.log(`Deleting coupon ${id}`);

    return this.http.delete<void>(url, { headers }).pipe(
        tap(() => console.log(`Coupon ${id} deleted`)),
        catchError(this.handleError('deleteCoupon'))
    );
  }

  // =================== STATE MANAGEMENT ===================

  /**
   * Tüm state'i temizle
   */
  clearCheckoutState(): void {
    console.log('Clearing checkout state');
    this.checkoutSummarySubject.next(null);
    this.appliedCouponSubject.next(null);
  }

  /**
   * Uygulanan kuponu temizle
   */
  clearAppliedCoupon(): void {
    console.log('Clearing applied coupon');
    this.appliedCouponSubject.next(null);
  }

  /**
   * Mevcut checkout summary'i al
   */
  getCurrentCheckoutSummary(): CheckoutSummary | null {
    return this.checkoutSummarySubject.value;
  }

  /**
   * Mevcut kuponu al
   */
  getCurrentAppliedCoupon(): Coupon | null {
    return this.appliedCouponSubject.value;
  }

  // =================== UTILITY METHODS ===================

  /**
   * Ukrainian currency format
   */
  formatUkrainianCurrency(amount: number): string {
    if (!Number.isFinite(amount)) {
      return '0.00 ₴';
    }

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
   * VAT percentage format
   */
  formatVATPercentage(rate: number): string {
    return `${(rate * 100).toFixed(0)}%`;
  }

  /**
   * Tutar doğrulama
   */
  isValidUkrainianAmount(amount: number): boolean {
    return Number.isFinite(amount) && amount > 0 && amount <= 999999.99;
  }

  // =================== PRIVATE HELPERS ===================

  /**
   * Auth headers
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.tokenService.getAccessToken();

    if (!token) {
      throw new Error('No authentication token available');
    }

    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept-Language': 'uk-UA'
    });
  }

  /**
   * Manual tax calculation fallback
   */
  private createManualTaxCalculation(
      originalPrice: number,
      discountAmount: number,
      taxRate: number
  ): Observable<TaxCalculation> {
    const subtotal = this.roundToTwo(originalPrice - discountAmount);
    const taxAmount = this.roundToTwo(subtotal * taxRate);
    const finalPrice = this.roundToTwo(subtotal + taxAmount);

    const calculation: TaxCalculation = {
      originalPrice: this.roundToTwo(originalPrice),
      discountAmount: this.roundToTwo(discountAmount),
      subtotal,
      taxRate,
      taxAmount,
      finalPrice
    };

    console.log('Manual tax calculation:', calculation);
    return of(calculation);
  }

  /**
   * Round to 2 decimals
   */
  private roundToTwo(num: number): number {
    return Math.round(num * 100) / 100;
  }

  /**
   * ID validation
   */
  private isValidId(id: number): boolean {
    return Number.isInteger(id) && id > 0;
  }

  /**
   * Coupon validation request check
   */
  private isValidCouponValidationRequest(request: CouponValidationRequest): boolean {
    return !!(
        request &&
        request.couponCode?.trim() &&
        this.isValidId(request.courseId) &&
        this.isValidId(request.userId) &&
        this.isValidUkrainianAmount(request.originalPrice)
    );
  }

  /**
   * Coupon create request check
   */
  private isValidCouponCreateRequest(request: CouponCreateRequest): boolean {
    return !!(
        request &&
        request.code?.trim() &&
        request.discountType &&
        request.discountValue > 0 &&
        request.validFrom &&
        request.validUntil
    );
  }

  /**
   * Error handler
   */
  private handleError(operation: string) {
    return (error: any): Observable<never> => {
      console.error(`${operation} failed:`, error);

      let userMessage = 'An error occurred';

      if (error.status === 401) {
        userMessage = 'Authentication required';
      } else if (error.status === 403) {
        userMessage = 'Access denied';
      } else if (error.status === 404) {
        userMessage = 'Resource not found';
      } else if (error.status === 400 && error.error?.code) {
        userMessage = this.getErrorMessage(error.error.code);
      } else if (error.error?.message) {
        userMessage = error.error.message;
      }

      return throwError(() => ({
        operation,
        message: userMessage,
        status: error.status,
        originalError: error
      }));
    };
  }

  /**
   * Error code'a göre mesaj
   */
  private getErrorMessage(errorCode: string): string {
    const errorMessages: Record<string, string> = {
      [CouponErrorCode.COUPON_NOT_FOUND]: 'Coupon not found',
      [CouponErrorCode.COUPON_EXPIRED]: 'Coupon has expired',
      [CouponErrorCode.USAGE_LIMIT_REACHED]: 'Coupon usage limit reached',
      [CouponErrorCode.NOT_APPLICABLE]: 'Coupon not applicable to this course',
      [CouponErrorCode.MINIMUM_AMOUNT_NOT_MET]: 'Minimum amount not met',
      [CouponErrorCode.COUPON_INACTIVE]: 'Coupon is inactive',
      [CouponErrorCode.INVALID_INSTRUCTOR]: 'Invalid instructor for this coupon'
    };

    return errorMessages[errorCode] || 'Unknown error';
  }
}