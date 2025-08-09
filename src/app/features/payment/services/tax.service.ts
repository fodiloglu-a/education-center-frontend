// src/app/features/payment/services/tax.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { TokenService } from '../../../core/services/token.service';
import { TaxCalculation } from '../models/coupon.model';
import { environment } from '../../../../environments/environment';

export interface TaxRate {
  country: string;
  countryCode: string;
  rate: number;
  type: TaxType;
  description: string;
}

export type TaxType = 'STANDARD' | 'REDUCED' | 'ZERO' | 'EDUCATION';

@Injectable({
  providedIn: 'root'
})
export class TaxService {
  private apiUrl = `${environment.apiUrl}/coupons`;

  // Türkiye KDV oranları
  private readonly TAX_RATES = {
    STANDARD: 0.18,    // %18 KDV
    REDUCED: 0.08,     // %8 KDV (eğitim materyalleri için)
    EDUCATION: 0.08,   // %8 KDV (eğitim hizmetleri)
    ZERO: 0.00         // %0 KDV
  };

  // Ülke bazlı vergi oranları
  private readonly COUNTRY_TAX_RATES: { [key: string]: TaxRate } = {
    'TR': { country: 'Turkey', countryCode: 'TR', rate: 0.18, type: 'STANDARD', description: 'Turkish VAT' },
    'UA': { country: 'Ukraine', countryCode: 'UA', rate: 0.20, type: 'STANDARD', description: 'Ukrainian VAT' },
    'DE': { country: 'Germany', countryCode: 'DE', rate: 0.19, type: 'STANDARD', description: 'German VAT' },
    'FR': { country: 'France', countryCode: 'FR', rate: 0.20, type: 'STANDARD', description: 'French VAT' },
    'UK': { country: 'United Kingdom', countryCode: 'UK', rate: 0.20, type: 'STANDARD', description: 'UK VAT' },
    'US': { country: 'United States', countryCode: 'US', rate: 0.00, type: 'ZERO', description: 'No federal sales tax' },
    'CA': { country: 'Canada', countryCode: 'CA', rate: 0.13, type: 'STANDARD', description: 'Canadian GST/HST' },
    'AU': { country: 'Australia', countryCode: 'AU', rate: 0.10, type: 'STANDARD', description: 'Australian GST' },
    'IT': { country: 'Italy', countryCode: 'IT', rate: 0.22, type: 'STANDARD', description: 'Italian VAT' },
    'ES': { country: 'Spain', countryCode: 'ES', rate: 0.21, type: 'STANDARD', description: 'Spanish VAT' },
    'NL': { country: 'Netherlands', countryCode: 'NL', rate: 0.21, type: 'STANDARD', description: 'Dutch VAT' },
    'SE': { country: 'Sweden', countryCode: 'SE', rate: 0.25, type: 'STANDARD', description: 'Swedish VAT' },
    'NO': { country: 'Norway', countryCode: 'NO', rate: 0.25, type: 'STANDARD', description: 'Norwegian VAT' },
    'PL': { country: 'Poland', countryCode: 'PL', rate: 0.23, type: 'STANDARD', description: 'Polish VAT' },
    'CZ': { country: 'Czech Republic', countryCode: 'CZ', rate: 0.21, type: 'STANDARD', description: 'Czech VAT' }
  };

  constructor(
      private http: HttpClient,
      private tokenService: TokenService
  ) {}

  // =================== BACKEND INTEGRATION ===================

  /**
   * Backend'den vergi hesaplaması yapar
   */
  calculateTaxViaBackend(
      originalPrice: number,
      discountAmount: number = 0,
      taxRate: number = this.TAX_RATES.STANDARD
  ): Observable<TaxCalculation> {
    const headers = this.getAuthHeaders();
    const params = new HttpParams()
        .set('originalPrice', originalPrice.toString())
        .set('discountAmount', discountAmount.toString())
        .set('taxRate', taxRate.toString());

    return this.http.post<TaxCalculation>(
        `${this.apiUrl}/calculate-tax`,
        null,
        { headers, params }
    ).pipe(
        catchError(error => {
          console.error('Backend tax calculation failed, falling back to local calculation:', error);
          // Backend başarısız olursa local hesaplama yap
          return of(this.calculateTax(originalPrice, discountAmount, this.getTaxTypeFromRate(taxRate)));
        })
    );
  }

  // =================== LOCAL TAX CALCULATIONS ===================

  /**
   * Yerel KDV hesaplaması yapar
   */
  calculateTax(
      originalPrice: number,
      discountAmount: number = 0,
      taxType: TaxType = 'STANDARD'
  ): TaxCalculation {
    const subtotal = originalPrice - discountAmount;
    const taxRate = this.TAX_RATES[taxType];
    const taxAmount = this.roundToTwoDecimals(subtotal * taxRate);
    const finalPrice = this.roundToTwoDecimals(subtotal + taxAmount);

    return {
      originalPrice: this.roundToTwoDecimals(originalPrice),
      discountAmount: this.roundToTwoDecimals(discountAmount),
      subtotal: this.roundToTwoDecimals(subtotal),
      taxRate,
      taxAmount,
      finalPrice
    };
  }

  /**
   * Ülke koduna göre vergi hesaplaması
   */
  calculateTaxByCountry(
      originalPrice: number,
      discountAmount: number = 0,
      countryCode: string
  ): TaxCalculation {
    const taxRate = this.getTaxRateByCountry(countryCode);
    const subtotal = originalPrice - discountAmount;
    const taxAmount = this.roundToTwoDecimals(subtotal * taxRate);
    const finalPrice = this.roundToTwoDecimals(subtotal + taxAmount);

    return {
      originalPrice: this.roundToTwoDecimals(originalPrice),
      discountAmount: this.roundToTwoDecimals(discountAmount),
      subtotal: this.roundToTwoDecimals(subtotal),
      taxRate,
      taxAmount,
      finalPrice
    };
  }

  /**
   * Eğitim hizmetleri için özel vergi hesaplaması
   */
  calculateEducationTax(
      originalPrice: number,
      discountAmount: number = 0,
      countryCode: string = 'TR'
  ): TaxCalculation {
    // Türkiye'de eğitim hizmetleri %8 KDV
    let taxRate = this.TAX_RATES.EDUCATION;

    // Diğer ülkeler için özel eğitim oranları (varsa)
    if (countryCode.toUpperCase() !== 'TR') {
      // Çoğu AB ülkesinde eğitim hizmetleri indirimli veya muaf
      const educationRates: { [key: string]: number } = {
        'DE': 0.07,  // Almanya %7
        'FR': 0.055, // Fransa %5.5
        'UK': 0.00,  // İngiltere muaf
        'UA': 0.00,  // Ukrayna muaf
        'US': 0.00,  // ABD genellikle muaf
      };

      taxRate = educationRates[countryCode.toUpperCase()] || this.getTaxRateByCountry(countryCode);
    }

    const subtotal = originalPrice - discountAmount;
    const taxAmount = this.roundToTwoDecimals(subtotal * taxRate);
    const finalPrice = this.roundToTwoDecimals(subtotal + taxAmount);

    return {
      originalPrice: this.roundToTwoDecimals(originalPrice),
      discountAmount: this.roundToTwoDecimals(discountAmount),
      subtotal: this.roundToTwoDecimals(subtotal),
      taxRate,
      taxAmount,
      finalPrice
    };
  }

  // =================== TAX RATE GETTERS ===================

  /**
   * Kullanıcının bulunduğu ülkeye göre vergi oranı belirle
   */
  getTaxRateByCountry(countryCode: string): number {
    const taxInfo = this.COUNTRY_TAX_RATES[countryCode.toUpperCase()];
    return taxInfo ? taxInfo.rate : this.TAX_RATES.STANDARD;
  }

  /**
   * Ülke vergi bilgilerini al
   */
  getTaxInfoByCountry(countryCode: string): TaxRate | null {
    return this.COUNTRY_TAX_RATES[countryCode.toUpperCase()] || null;
  }

  /**
   * Eğitim materyali için indirimli KDV oranı
   */
  getEducationTaxRate(countryCode: string = 'TR'): number {
    if (countryCode.toUpperCase() === 'TR') {
      return this.TAX_RATES.EDUCATION;
    }

    // Diğer ülkeler için eğitim oranları
    const educationRates: { [key: string]: number } = {
      'DE': 0.07,
      'FR': 0.055,
      'UK': 0.00,
      'UA': 0.00,
      'US': 0.00,
    };

    return educationRates[countryCode.toUpperCase()] || this.getTaxRateByCountry(countryCode);
  }

  /**
   * Tüm desteklenen ülkelerin vergi oranlarını al
   */
  getAllSupportedTaxRates(): TaxRate[] {
    return Object.values(this.COUNTRY_TAX_RATES);
  }

  // =================== PRICE CALCULATIONS ===================

  /**
   * KDV dahil fiyattan KDV hariç fiyat hesaplar
   */
  calculatePriceExcludingTax(
      priceIncludingTax: number,
      taxType: TaxType = 'STANDARD'
  ): number {
    const taxRate = this.TAX_RATES[taxType];
    const priceExcludingTax = priceIncludingTax / (1 + taxRate);
    return this.roundToTwoDecimals(priceExcludingTax);
  }

  /**
   * KDV hariç fiyattan KDV dahil fiyat hesaplar
   */
  calculatePriceIncludingTax(
      priceExcludingTax: number,
      taxType: TaxType = 'STANDARD'
  ): number {
    const taxRate = this.TAX_RATES[taxType];
    const priceIncludingTax = priceExcludingTax * (1 + taxRate);
    return this.roundToTwoDecimals(priceIncludingTax);
  }

  /**
   * Ülke koduna göre KDV dahil fiyat hesaplar
   */
  calculatePriceIncludingTaxByCountry(
      priceExcludingTax: number,
      countryCode: string
  ): number {
    const taxRate = this.getTaxRateByCountry(countryCode);
    const priceIncludingTax = priceExcludingTax * (1 + taxRate);
    return this.roundToTwoDecimals(priceIncludingTax);
  }

  // =================== FORMATTING AND DISPLAY ===================

  /**
   * KDV breakdown'ı formatla
   */
  formatTaxBreakdown(
      calculation: TaxCalculation,
      currency: string = 'UAH',
      locale: string = 'uk-UA'
  ): {
    originalPrice: string;
    discount: string;
    subtotal: string;
    tax: string;
    taxPercentage: string;
    total: string;
  } {
    return {
      originalPrice: this.formatCurrency(calculation.originalPrice, currency, locale),
      discount: this.formatCurrency(calculation.discountAmount, currency, locale),
      subtotal: this.formatCurrency(calculation.subtotal, currency, locale),
      tax: this.formatCurrency(calculation.taxAmount, currency, locale),
      taxPercentage: `${(calculation.taxRate * 100).toFixed(1)}%`,
      total: this.formatCurrency(calculation.finalPrice, currency, locale)
    };
  }

  /**
   * Vergi oranını yüzde olarak formatla
   */
  formatTaxRate(taxRate: number): string {
    return `${(taxRate * 100).toFixed(1)}%`;
  }

  /**
   * Ülke bazlı vergi bilgilerini formatla
   */
  formatTaxInfo(countryCode: string): string {
    const taxInfo = this.getTaxInfoByCountry(countryCode);
    if (!taxInfo) {
      return `Unknown tax rate for ${countryCode}`;
    }

    return `${taxInfo.country}: ${this.formatTaxRate(taxInfo.rate)} (${taxInfo.description})`;
  }

  // =================== VALIDATION AND UTILITIES ===================

  /**
   * Vergi hesaplamasının doğruluğunu kontrol et
   */
  validateTaxCalculation(calculation: TaxCalculation): boolean {
    const expectedSubtotal = calculation.originalPrice - calculation.discountAmount;
    const expectedTaxAmount = expectedSubtotal * calculation.taxRate;
    const expectedFinalPrice = expectedSubtotal + expectedTaxAmount;

    return (
        Math.abs(calculation.subtotal - expectedSubtotal) < 0.01 &&
        Math.abs(calculation.taxAmount - expectedTaxAmount) < 0.01 &&
        Math.abs(calculation.finalPrice - expectedFinalPrice) < 0.01
    );
  }

  /**
   * İki vergi hesaplamasını karşılaştır
   */
  compareTaxCalculations(calc1: TaxCalculation, calc2: TaxCalculation): boolean {
    return (
        Math.abs(calc1.originalPrice - calc2.originalPrice) < 0.01 &&
        Math.abs(calc1.discountAmount - calc2.discountAmount) < 0.01 &&
        Math.abs(calc1.subtotal - calc2.subtotal) < 0.01 &&
        Math.abs(calc1.taxRate - calc2.taxRate) < 0.001 &&
        Math.abs(calc1.taxAmount - calc2.taxAmount) < 0.01 &&
        Math.abs(calc1.finalPrice - calc2.finalPrice) < 0.01
    );
  }

  /**
   * Vergi tipi kontrolü
   */
  isValidTaxType(taxType: string): taxType is TaxType {
    return ['STANDARD', 'REDUCED', 'ZERO', 'EDUCATION'].includes(taxType);
  }

  /**
   * Ülke kodu kontrolü
   */
  isSupportedCountry(countryCode: string): boolean {
    return this.COUNTRY_TAX_RATES.hasOwnProperty(countryCode.toUpperCase());
  }

  // =================== PRIVATE HELPER METHODS ===================

  /**
   * Para birimi formatla
   */
  private formatCurrency(amount: number, currency: string, locale: string = 'uk-UA'): string {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      // Fallback formatting
      return `${amount.toFixed(2)} ${currency}`;
    }
  }

  /**
   * İki ondalık basamağa yuvarla
   */
  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Auth headers oluştur
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.tokenService.getAccessToken();

    if (!token) {
      throw new Error('No authentication token available');
    }

    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Vergi oranından vergi tipini belirle
   */
  private getTaxTypeFromRate(rate: number): TaxType {
    if (rate === 0) return 'ZERO';
    if (rate === this.TAX_RATES.REDUCED || rate === this.TAX_RATES.EDUCATION) return 'EDUCATION';
    return 'STANDARD';
  }

  // =================== BACKWARD COMPATIBILITY ===================

  /**
   * Eski API ile uyumluluk için (deprecated)
   * @deprecated Use calculateTax instead
   */
  calculateTaxOld(
      originalPrice: number,
      discountAmount: number = 0,
      taxType: 'STANDARD' | 'REDUCED' | 'ZERO' = 'STANDARD'
  ): TaxCalculation {
    console.warn('calculateTaxOld is deprecated. Use calculateTax instead.');
    return this.calculateTax(originalPrice, discountAmount, taxType);
  }
}