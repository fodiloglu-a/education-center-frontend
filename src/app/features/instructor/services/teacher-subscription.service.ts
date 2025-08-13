// services/teacher-subscription.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import {
    TeacherSubscriptionStatus,
    TeacherSubscriptionPlansResponse,
    TeacherSubscriptionCheckoutSummary,
    TeacherSubscriptionPaymentRequest,
    TeacherSubscriptionPaymentResponse,
    TeacherSubscriptionCallbackData,
    TeacherSubscriptionCallbackResponse,
    TeacherPlanType,
    TeacherSubscriptionStatusType
} from '../models/instructor.models';

@Injectable({
    providedIn: 'root'
})
export class TeacherSubscriptionService {
    private readonly API_URL = 'https://education-center-backand.onrender.com/api/teacher-subscription';

    // Abonelik durumu için subject
    private subscriptionStatusSubject = new BehaviorSubject<TeacherSubscriptionStatus | null>(null);
    public subscriptionStatus$ = this.subscriptionStatusSubject.asObservable();

    constructor(private http: HttpClient) {
        // Sayfa yüklendiğinde abonelik durumunu kontrol et
        this.checkSubscriptionStatus().subscribe();
    }

    /**
     * Eğitmen abonelik durumunu kontrol et
     */
    checkSubscriptionStatus(): Observable<TeacherSubscriptionStatus> {
        return this.http.get<TeacherSubscriptionStatus>(`${this.API_URL}/status`)
            .pipe(
                tap(status => {
                    this.subscriptionStatusSubject.next(status);
                })
            );
    }

    /**
     * Abonelik planlarını getir
     */
    getSubscriptionPlans(): Observable<TeacherSubscriptionPlansResponse> {
        return this.http.get<TeacherSubscriptionPlansResponse>(`${this.API_URL}/plans`);
    }

    /**
     * Checkout özetini al
     */
    getCheckoutSummary(planType: string, customAmount?: number): Observable<TeacherSubscriptionCheckoutSummary> {
        let params = new HttpParams().set('planType', planType);

        if (customAmount && planType === TeacherPlanType.CUSTOM) {
            params = params.set('customAmount', customAmount.toString());
        }

        return this.http.post<TeacherSubscriptionCheckoutSummary>(
            `${this.API_URL}/checkout-summary`,
            null,
            { params }
        );
    }

    /**
     * Abonelik ödemesini başlat
     */
    initiateSubscriptionPayment(request: TeacherSubscriptionPaymentRequest): Observable<TeacherSubscriptionPaymentResponse> {
        const planType = request.planType;
        let params = new HttpParams();

        if (request.customAmount && planType === TeacherPlanType.CUSTOM) {
            params = params.set('customAmount', request.customAmount.toString());
        }

        return this.http.post<TeacherSubscriptionPaymentResponse>(
            `${this.API_URL}/checkout/${planType}`,
            null,
            { params }
        );
    }

    /**
     * Client callback işle (ödeme sonrası)
     */
    handleClientCallback(callbackData: TeacherSubscriptionCallbackData): Observable<TeacherSubscriptionCallbackResponse> {
        return this.http.post<TeacherSubscriptionCallbackResponse>(
            `${this.API_URL}/client-callback`,
            callbackData
        ).pipe(
            tap(response => {
                // Başarılı ödeme sonrası abonelik durumunu güncelle
                if (response.success) {
                    this.checkSubscriptionStatus().subscribe();
                }
            })
        );
    }

    /**
     * Abonelik durumunu manuel olarak yenile
     */
    refreshSubscriptionStatus(): Observable<TeacherSubscriptionStatus> {
        return this.checkSubscriptionStatus();
    }

    /**
     * Mevcut abonelik durumunu al (cache'den)
     */
    getCurrentSubscriptionStatus(): TeacherSubscriptionStatus | null {
        return this.subscriptionStatusSubject.value;
    }

    /**
     * Kullanıcının eğitmen olup olmadığını kontrol et
     */
    isTeacher(): boolean {
        const status = this.getCurrentSubscriptionStatus();
        return status?.isTeacher || false;
    }

    /**
     * Kullanıcının kurs yayınlayıp yayınlayamayacağını kontrol et
     */
    canPublishCourses(): boolean {
        const status = this.getCurrentSubscriptionStatus();
        return status?.canPublishCourses || false;
    }

    /**
     * Abonelik satın alması gerekip gerekmediğini kontrol et
     */
    needsSubscription(): boolean {
        const status = this.getCurrentSubscriptionStatus();
        return status?.needsSubscription || false;
    }

    /**
     * Abonelik durumu tipini hesapla
     */
    getSubscriptionStatusType(): TeacherSubscriptionStatusType {
        const status = this.getCurrentSubscriptionStatus();

        if (!status?.isTeacher) {
            return TeacherSubscriptionStatusType.INACTIVE;
        }

        if (status.daysUntilExpiry !== undefined) {
            if (status.daysUntilExpiry <= 0) {
                return TeacherSubscriptionStatusType.EXPIRED;
            } else if (status.daysUntilExpiry <= 7) {
                return TeacherSubscriptionStatusType.EXPIRING_SOON;
            }
        }

        return TeacherSubscriptionStatusType.ACTIVE;
    }

    /**
     * Plan tipine göre önerilen plan olup olmadığını kontrol et
     */
    isRecommendedPlan(planType: TeacherPlanType): boolean {
        // Premium yıllık planı önerilen plan olarak işaretle
        return planType === TeacherPlanType.YEARLY_PREMIUM;
    }

    /**
     * Plan tipine göre popüler plan olup olmadığını kontrol et
     */
    isPopularPlan(planType: TeacherPlanType): boolean {
        // Aylık premium planı popüler plan olarak işaretle
        return planType === TeacherPlanType.MONTHLY_PREMIUM;
    }

    /**
     * Plan fiyatını formatla
     */
    formatPlanPrice(price: number, currency: string = 'UAH'): string {
        return new Intl.NumberFormat('uk-UA', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(price);
    }

    /**
     * Plan tasarruf miktarını formatla
     */
    formatSavings(savings: number, currency: string = 'UAH'): string {
        return this.formatPlanPrice(savings, currency);
    }

    /**
     * LiqPay ödeme formunu oluştur ve submit et
     */
    submitLiqPayForm(paymentData: TeacherSubscriptionPaymentResponse): void {
        // LiqPay form elementi oluştur
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = 'https://www.liqpay.ua/api/3/checkout';
        form.style.display = 'none';

        // Data input
        const dataInput = document.createElement('input');
        dataInput.type = 'hidden';
        dataInput.name = 'data';
        dataInput.value = paymentData.data;
        form.appendChild(dataInput);

        // Signature input
        const signatureInput = document.createElement('input');
        signatureInput.type = 'hidden';
        signatureInput.name = 'signature';
        signatureInput.value = paymentData.signature;
        form.appendChild(signatureInput);

        // Form'u DOM'a ekle ve submit et
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
    }

    /**
     * Özel tutar validasyonu (CUSTOM plan için)
     */
    validateCustomAmount(amount: number): { valid: boolean; message?: string } {
        if (amount < 100) {
            return {
                valid: false,
                message: 'Minimum tutar 100 UAH olmalıdır.'
            };
        }

        if (amount > 10000) {
            return {
                valid: false,
                message: 'Maksimum tutar 10,000 UAH olabilir.'
            };
        }

        return { valid: true };
    }

    /**
     * Plan özelliklerini TypeScript'e uygun şekilde parse et
     */
    parsePlanFeatures(features: string[]): string[] {
        return features || [];
    }

    /**
     * Service'i temizle (component destroy'da kullanılabilir)
     */
    cleanup(): void {
        // Gerekirse subscription'ları temizle
    }
}