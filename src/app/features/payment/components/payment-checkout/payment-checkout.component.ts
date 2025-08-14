// src/app/features/payment/components/payment-checkout/payment-checkout.component.ts

import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { CheckoutService } from '../../services/checkout.service';
import { PaymentService } from '../../services/payment.service';
import {
  CouponValidationRequest,
  CouponValidationResponse,
  CheckoutSummary,
  Coupon, Course
} from '../../models/coupon.model';
import { PaymentResponse } from '../../models/payment.models';
import { CourseService } from "../../../courses/services/course.service";
import { CourseResponse } from "../../../courses/models/course.models";
import { UserProfile } from '../../../auth/models/auth.models';

import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertDialogComponent } from '../../../../shared/components/alert-dialog/alert-dialog.component';
import { AuthService } from "../../../../core/services/auth.service";


@Component({
  selector: 'app-payment-checkout',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TranslateModule,
    LoadingSpinnerComponent,
    AlertDialogComponent
  ],
  templateUrl: './payment-checkout.component.html',
  styleUrl: './payment-checkout.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentCheckoutComponent implements OnInit, OnDestroy {

  // Forms - Basitleştirildi
  couponForm!: FormGroup;
  paymentForm!: FormGroup; // Sadece terms checkbox için

  // State
  isLoading = true;
  isValidatingCoupon = false;
  isProcessingPayment = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  warningMessage: string | null = null;

  // Data
  course: CourseResponse | null = null;
  currentUser: UserProfile | null = null;
  courseId: number | null = null;
  checkoutSummary: CheckoutSummary | null = null;

  // Coupon
  appliedCoupon: Coupon | null = null;

  // Constants - Ukrayna için güncellenmiş
  private readonly TAX_RATE = 0.20; // 20% Ukrainian VAT (KDV)
  private readonly CURRENCY = 'UAH';
  private readonly CURRENCY_LOCALE = 'uk-UA';

  private destroy$ = new Subject<void>();

  constructor(
      private route: ActivatedRoute,
      private router: Router,
      private courseService: CourseService,
      private checkoutService: CheckoutService,
      private paymentService: PaymentService,
      private authService: AuthService,
      private translate: TranslateService,
      private cdr: ChangeDetectorRef
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadPageData();

    // Debug için global window nesnesine ekle (sadece development için)

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Cleanup checkout state
    this.checkoutService.clearCheckoutState();
  }

  // ========== INITIALIZATION ==========

  private initializeForms(): void {
    // Kupon formu
    this.couponForm = new FormGroup({
      couponCode: new FormControl('', [
        Validators.maxLength(50),
        Validators.pattern(/^[A-Za-z0-9-_]+$/)
      ])
    });

    // Sadece terms checkbox için basitleştirilmiş form
    this.paymentForm = new FormGroup({
      acceptTerms: new FormControl(false, [Validators.requiredTrue])
    });

    // Kupon değişikliklerini dinle
    this.setupCouponFormListeners();
  }

  private setupCouponFormListeners(): void {
    const couponCodeControl = this.couponForm.get('couponCode');

    if (couponCodeControl) {
      couponCodeControl.valueChanges.pipe(
          takeUntil(this.destroy$)
      ).subscribe(value => {
        // Kupon kodu temizlendiğinde applied coupon'ı kaldır
        if (!value || value.trim() === '') {
          if (this.appliedCoupon) {
            this.removeCoupon();
          }
        }
      });
    }
  }

  // Coupon input'u enable/disable etme metodu
  private toggleCouponInput(disabled: boolean): void {
    const couponCodeControl = this.couponForm.get('couponCode');
    if (couponCodeControl) {
      if (disabled) {
        couponCodeControl.disable();
      } else {
        couponCodeControl.enable();
      }
    }
  }

  private loadPageData(): void {
    this.route.paramMap.pipe(
        takeUntil(this.destroy$)
    ).subscribe(params => {
      const id = params.get('courseId');
      if (id && !isNaN(+id)) {
        this.courseId = +id;
        this.loadData();
      } else {
        this.setError('Invalid course ID');
        this.isLoading = false;
      }
    });
  }

  private loadData(): void {
    if (!this.courseId) return;

    this.isLoading = true;
    console.log('📚 Loading checkout data for course:', this.courseId);

    // Paralel olarak user ve course verilerini yükle
    this.authService.getCurrentUser().pipe(
        takeUntil(this.destroy$)
    ).subscribe({
      next: (user) => {
        if (user?.id) {
          this.currentUser = user;
          this.loadCourse();
        } else {
          this.setError('User authentication required');
        }
      },
      error: (error) => {
        console.error('❌ User loading failed:', error);
        this.setError('Authentication failed. Please login again.');
      }
    });
  }

  private loadCourse(): void {
    if (!this.courseId) return;

    this.courseService.getCourseResponseById(this.courseId).pipe(
        takeUntil(this.destroy$)
    ).subscribe({
      next: (course) => {
        console.log('📚 Course loaded:', course);
        this.course = course;
        this.createInitialCheckout();
      },
      error: (error) => {
        console.error('❌ Course loading failed:', error);
        this.setError('Course not found or unavailable');
        this.isLoading = false;
      }
    });
  }

  // ========== CHECKOUT OPERATIONS ==========

  private createInitialCheckout(): void {
    if (!this.courseId || !this.currentUser?.id || !this.course) {
      this.setError('Missing required data for checkout');
      return;
    }

    console.log('💰 Creating Ukrainian checkout summary with 20% VAT');

    // Backend checkout summary endpoint'ini çağır
    this.checkoutService.createCheckoutSummary(
        this.courseId,
        this.currentUser.id,
        undefined, // no coupon initially
        this.TAX_RATE
    ).pipe(
        takeUntil(this.destroy$)
    ).subscribe({
      next: (summary) => {
        console.log('✅ Ukrainian checkout summary from backend:', summary);
        this.checkoutSummary = summary;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('❌ Backend checkout failed, creating manual Ukrainian summary:', error);
        // Backend başarısız olursa manuel hesaplama yap
        this.checkoutSummary = this.createManualCheckoutSummary();
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Manuel Ukrainian checkout summary oluştur
   */
  private createManualCheckoutSummary(): CheckoutSummary {
    if (!this.course || !this.currentUser) {
      throw new Error('Cannot create manual checkout summary without course and user data');
    }

    const originalPrice = this.course.price;
    const discountAmount = 0;
    const subtotal = originalPrice - discountAmount;
    const taxAmount = subtotal * this.TAX_RATE; // 20% Ukrainian VAT
    const finalPrice = subtotal + taxAmount;

    const summary: CheckoutSummary = {
      courseId: this.course.id,
      courseName: this.course.title,
      instructorId: this.course.instructorId,
      instructorName: this.course.instructorName || 'Unknown Instructor',

      originalPrice: this.roundToTwoDecimals(originalPrice),
      discountAmount: this.roundToTwoDecimals(discountAmount),
      subtotal: this.roundToTwoDecimals(subtotal),
      taxRate: this.TAX_RATE,
      taxAmount: this.roundToTwoDecimals(taxAmount),
      finalPrice: this.roundToTwoDecimals(finalPrice),
      currency: this.CURRENCY,
      userId: this.currentUser.id
    };

    console.log('🇺🇦 Ukrainian manual checkout summary created:', {
      originalPrice: `${originalPrice} UAH`,
      discountAmount: `${discountAmount} UAH`,
      subtotal: `${subtotal} UAH`,
      taxAmount: `${taxAmount} UAH (20% VAT)`,
      finalPrice: `${finalPrice} UAH`,
      taxRate: `${this.TAX_RATE * 100}%`
    });

    return summary;
  }

  /**
   * İki ondalık basamağa yuvarla
   */
  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }

  // ========== COUPON OPERATIONS ==========

  applyCoupon(): void {
    const couponCode = this.couponCode?.value?.trim().toUpperCase();

    if (!couponCode || couponCode.length < 3) {
      this.setWarning('Please enter a valid coupon code (minimum 3 characters)');
      return;
    }

    if (!this.courseId || !this.currentUser?.id || !this.course) {
      this.setError('Missing required data for coupon validation');
      return;
    }

    if (this.appliedCoupon) {
      this.setWarning('A coupon is already applied. Remove it first to apply a new one.');
      return;
    }

    this.isValidatingCoupon = true;
    this.toggleCouponInput(true);
    this.clearMessages();
    console.log('🎫 Validating coupon:', couponCode);

    const request: CouponValidationRequest = {
      couponCode,
      courseId: this.courseId,
      originalPrice: this.course.price,
      userId: this.currentUser.id
    };

    this.checkoutService.validateCoupon(request).pipe(
        takeUntil(this.destroy$)
    ).subscribe({
      next: (response: CouponValidationResponse) => {
        this.isValidatingCoupon = false;
        this.toggleCouponInput(false);

        if (response.valid && response.coupon) {
          console.log('✅ Coupon valid:', response);

          // Sadece ihtiyacımız olan alanları al
          this.appliedCoupon = {
            id: response.coupon.id,
            code: response.coupon.code,
            discountType: response.coupon.discountType,
            discountValue: response.coupon.discountValue,
            minimumAmount: response.coupon.minimumAmount,
            maximumDiscount: response.coupon.maximumDiscount,
            validFrom: response.coupon.validFrom,
            validUntil: response.coupon.validUntil,
            usageLimit: response.coupon.usageLimit,
            usedCount: response.coupon.usedCount,
            isActive: response.coupon.isActive,
            description: response.coupon.description,
            createdAt: response.coupon.createdAt,
            updatedAt: response.coupon.updatedAt,
            instructor: {
              id: response.coupon.instructor?.id || 0,
              firstName: response.coupon.instructor?.firstName || '',
              lastName: response.coupon.instructor?.lastName || '',
              email: response.coupon.instructor?.email || ''
            },
            applicableCourses: [],
            applicableCategories: response.coupon.applicableCategories || []
          };

          const discountText = this.formatCurrency(response.discountAmount);
          this.setSuccess(`Coupon applied successfully! You save ${discountText}`);

          this.updateCheckoutWithCoupon(couponCode);
        } else {
          console.log('❌ Coupon invalid:', response);
          this.setError(response.message || 'Invalid coupon code');
          this.clearCouponInput();
        }

        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('❌ Coupon validation error:', error);
        this.isValidatingCoupon = false;
        this.toggleCouponInput(false);
        this.setError(error.message || 'Coupon validation failed. Please try again.');
        this.clearCouponInput();
        this.cdr.markForCheck();
      }
    });
  }

  private updateCheckoutWithCoupon(couponCode: string): void {
    if (!this.courseId || !this.currentUser?.id) return;

    console.log('🎫 Updating Ukrainian checkout with coupon:', couponCode);

    // Backend checkout summary endpoint'ini çağır
    this.checkoutService.createCheckoutSummary(
        this.courseId,
        this.currentUser.id,
        couponCode,
        this.TAX_RATE
    ).pipe(
        takeUntil(this.destroy$)
    ).subscribe({
      next: (summary) => {
        console.log('✅ Ukrainian checkout updated with coupon from backend:', summary);
        this.checkoutSummary = summary;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('❌ Backend checkout with coupon failed, using manual calculation:', error);
        this.checkoutSummary = this.createManualCheckoutSummaryWithCoupon(couponCode);
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Kuponlu Ukrainian checkout summary oluştur
   */
  private createManualCheckoutSummaryWithCoupon(couponCode: string): CheckoutSummary {
    if (!this.course || !this.currentUser || !this.appliedCoupon) {
      return this.createManualCheckoutSummary();
    }

    const originalPrice = this.course.price;
    let discountAmount = 0;

    // Kupon tipine göre indirim hesapla
    if (this.appliedCoupon.discountType === 'PERCENTAGE') {
      discountAmount = (originalPrice * this.appliedCoupon.discountValue) / 100;
    } else if (this.appliedCoupon.discountType === 'FIXED_AMOUNT') {
      discountAmount = this.appliedCoupon.discountValue;
    }

    // Kontroller
    if (this.appliedCoupon.maximumDiscount && discountAmount > this.appliedCoupon.maximumDiscount) {
      discountAmount = this.appliedCoupon.maximumDiscount;
    }

    if (this.appliedCoupon.minimumAmount && originalPrice < this.appliedCoupon.minimumAmount) {
      discountAmount = 0;
    }

    const subtotal = originalPrice - discountAmount;
    const taxAmount = subtotal * this.TAX_RATE; // 20% Ukrainian VAT
    const finalPrice = subtotal + taxAmount;

    const summary: CheckoutSummary = {
      courseId: this.course.id,
      courseName: this.course.title,
      instructorId: this.course.instructorId,
      instructorName: this.course.instructorName || 'Unknown Instructor',

      originalPrice: this.roundToTwoDecimals(originalPrice),
      coupon: this.appliedCoupon,
      discountAmount: this.roundToTwoDecimals(discountAmount),
      subtotal: this.roundToTwoDecimals(subtotal),
      taxRate: this.TAX_RATE,
      taxAmount: this.roundToTwoDecimals(taxAmount),
      finalPrice: this.roundToTwoDecimals(finalPrice),
      currency: this.CURRENCY,
      userId: this.currentUser.id
    };

    console.log('🇺🇦 Ukrainian manual checkout summary with coupon created:', {
      originalPrice: `${originalPrice} UAH`,
      discountAmount: `${discountAmount} UAH`,
      subtotal: `${subtotal} UAH`,
      taxAmount: `${taxAmount} UAH (20% VAT)`,
      finalPrice: `${finalPrice} UAH`,
      couponType: this.appliedCoupon.discountType,
      couponValue: this.appliedCoupon.discountValue
    });

    return summary;
  }

  removeCoupon(): void {
    console.log('🗑️ Removing coupon');
    this.appliedCoupon = null;
    this.clearCouponInput();
    this.toggleCouponInput(false); // Ensure input is enabled
    this.createInitialCheckout(); // Recalculate without coupon
    this.clearMessages();
    this.setSuccess('Coupon removed successfully');
  }

  private clearCouponInput(): void {
    this.couponForm.patchValue({ couponCode: '' }, { emitEvent: false });
    this.toggleCouponInput(false); // Ensure input is enabled
  }

  // ========== CIRCULAR REFERENCE PROTECTION ==========

  /**
   * Circular reference'ları temizleyerek güvenli coupon data oluştur
   */
  private sanitizeCouponData(coupon: any): Coupon {
    try {
      const sanitized: Coupon = {
        id: coupon.id,
        code: coupon.code,
        instructor: coupon.instructor ? {
          id: coupon.instructor.id,
          firstName: coupon.instructor.firstName || '',
          lastName: coupon.instructor.lastName || '',
          email: coupon.instructor.email || ''
        } : {
          id: 0,
          firstName: 'Unknown',
          lastName: 'Instructor',
          email: ''
        },
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minimumAmount: coupon.minimumAmount,
        maximumDiscount: coupon.maximumDiscount,
        validFrom: coupon.validFrom,
        validUntil: coupon.validUntil,
        usageLimit: coupon.usageLimit,
        usedCount: coupon.usedCount || 0,
        isActive: coupon.isActive,
        description: coupon.description,
        createdAt: coupon.createdAt,
        updatedAt: coupon.updatedAt,
        applicableCourses: this.sanitizeCourseArray(coupon.applicableCourses),
        applicableCategories: coupon.applicableCategories || []
      };

      console.log('🧹 Coupon data sanitized successfully:', {
        id: sanitized.id,
        code: sanitized.code,
        discountType: sanitized.discountType,
        discountValue: sanitized.discountValue
      });

      return sanitized;
    } catch (error) {
      console.error('❌ Error sanitizing coupon data:', error);
      throw new Error('Invalid coupon data format');
    }
  }

  /**
   * Course array'ini circular reference'tan temizle
   */
  private sanitizeCourseArray(courses: any[]): Course[] {
    if (!courses || !Array.isArray(courses)) {
      return [];
    }

    return courses.map(course => {
      try {
        return {
          id: course.id,
          title: course.title || 'Unknown Course',
          description: course.description || '',
          imageUrl: course.imageUrl,
          instructor: course.instructor ? {
            id: course.instructor.id,
            firstName: course.instructor.firstName || '',
            lastName: course.instructor.lastName || ''
          } : {
            id: 0,
            firstName: 'Unknown',
            lastName: 'Instructor'
          },
          price: course.price || 0,
          published: course.published || false,
          createdAt: course.createdAt || new Date().toISOString(),
          updatedAt: course.updatedAt,
          category: course.category,
          duration: course.duration || 0,
          level: course.level,
          language: course.language || 'uk',
          externalPurchaseUrl: course.externalPurchaseUrl,
          requirements: course.requirements || [],
          whatYouWillLearn: course.whatYouWillLearn || [],
          targetAudience: course.targetAudience || [],
          certificateAvailable: course.certificateAvailable || false,
          isPreview: course.isPreview || false
        };
      } catch (error) {
        console.warn('⚠️ Skipping invalid course in coupon data:', error);
        return null;
      }
    }).filter(course => course !== null) as Course[];
  }

  /**
   * JSON response'unu güvenli şekilde parse et
   */
  private safeParseResponse(response: any): any {
    try {
      // Eğer response string ise parse et
      if (typeof response === 'string') {
        return JSON.parse(response);
      }

      // Zaten object ise direkt döndür ama deep clone yap
      return JSON.parse(JSON.stringify(response));
    } catch (error) {
      console.error('❌ Error parsing response:', error);
      return response; // Original'i döndür
    }
  }

  /**
   * Response validation
   */
  private validateCouponResponse(response: CouponValidationResponse): boolean {
    if (!response) {
      console.error('❌ Empty coupon response');
      return false;
    }

    if (response.valid && !response.coupon) {
      console.error('❌ Valid response but no coupon data');
      return false;
    }

    if (response.valid && response.coupon && !response.coupon.code) {
      console.error('❌ Coupon missing required code field');
      return false;
    }

    return true;
  }

  proceedToPayment(): void {
    if (!this.canProceedToPayment()) {
      if (!this.acceptTerms?.value) {
        this.setError('Please accept the terms and conditions to proceed');
      } else {
        this.setError('Cannot proceed to payment at this time');
      }
      return;
    }

    if (!this.checkoutSummary || !this.courseId) {
      this.setError('Checkout information is not ready');
      return;
    }

    this.isProcessingPayment = true;
    this.clearMessages();
    console.log('💳 Initiating LiqPay payment for course:', this.courseId);

    // LiqPay ödeme başlatma
    // BURADA YENİLEME YAPILDI: İndirim miktarını (discountAmount) ödeme servisine gönderiyoruz.
    const discountAmount = this.getDiscountAmount(); // İndirim miktarını al
    this.paymentService.initiatePayment(this.courseId, discountAmount).pipe(
        takeUntil(this.destroy$)
    ).subscribe({
      next: (response: PaymentResponse) => {
        console.log('✅ LiqPay payment initiated:', response);
        this.isProcessingPayment = false;

        if (response.data && response.signature) {
          this.redirectToLiqPay(response);
        } else {
          this.setError('Invalid payment response. Please try again.');
        }

        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('❌ Payment initiation failed:', error);
        this.isProcessingPayment = false;
        this.setError(error.message || 'Payment processing failed. Please try again.');
        this.cdr.markForCheck();
      }
    });
  }


  private redirectToLiqPay(paymentResponse: PaymentResponse): void {
    console.log('🔄 Redirecting to LiqPay...');

    try {
      // LiqPay form oluştur ve submit et
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = 'https://www.liqpay.ua/api/3/checkout';
      form.style.display = 'none';

      // Data field
      const dataInput = document.createElement('input');
      dataInput.type = 'hidden';
      dataInput.name = 'data';
      dataInput.value = paymentResponse.data;
      form.appendChild(dataInput);

      // Signature field
      const signatureInput = document.createElement('input');
      signatureInput.type = 'hidden';
      signatureInput.name = 'signature';
      signatureInput.value = paymentResponse.signature;
      form.appendChild(signatureInput);

      // Form'u sayfaya ekle ve submit et
      document.body.appendChild(form);
      form.submit();

      // Cleanup
      document.body.removeChild(form);

    } catch (error) {
      console.error('❌ LiqPay redirect failed:', error);
      this.setError('Failed to redirect to payment. Please try again.');
      this.isProcessingPayment = false;
      this.cdr.markForCheck();
    }
  }

  // ========== UTILITIES ==========

  formatCurrency(amount: number): string {
    if (isNaN(amount)) return '0.00 UAH';

    try {
      return new Intl.NumberFormat(this.CURRENCY_LOCALE, {
        style: 'currency',
        currency: this.CURRENCY,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      // Fallback formatting
      return `${amount.toFixed(2)} ${this.CURRENCY}`;
    }
  }

  getTaxPercentage(): string {
    if (!this.checkoutSummary) return '20';
    return `${(this.checkoutSummary.taxRate * 100).toFixed(0)}`;
  }

  // ========== GETTERS WITH DEBUG ==========

  getOriginalPrice(): number {
    const price = this.checkoutSummary?.originalPrice || this.course?.price || 0;
    console.log('🔍 Original Price:', price);
    return price;
  }

  getDiscountAmount(): number {
    const discount = this.checkoutSummary?.discountAmount || 0;
    console.log('🔍 Discount Amount:', discount);
    return discount;
  }

  getSubtotal(): number {
    const subtotal = this.checkoutSummary?.subtotal || (this.getOriginalPrice() - this.getDiscountAmount());
    console.log('🔍 Subtotal:', subtotal);
    return subtotal;
  }

  getTaxAmount(): number {
    let taxAmount = this.checkoutSummary?.taxAmount || 0;

    // Eğer vergi hesaplanmamışsa manuel hesapla (%20 Ukrainian VAT)
    if (taxAmount === 0 && this.getSubtotal() > 0) {
      taxAmount = this.getSubtotal() * this.TAX_RATE;
      console.log('⚠️ Ukrainian tax amount calculated manually:', taxAmount);
    }

    console.log('🇺🇦 Ukrainian Tax Amount:', taxAmount, `(${this.getTaxPercentage()}%)`);
    return this.roundToTwoDecimals(taxAmount);
  }

  getFinalPrice(): number {
    let finalPrice = this.checkoutSummary?.finalPrice || 0;

    // Eğer final price hesaplanmamışsa manuel hesapla
    if (finalPrice === 0 || Math.abs(finalPrice - (this.getSubtotal() + this.getTaxAmount())) > 0.01) {
      finalPrice = this.getSubtotal() + this.getTaxAmount();
      console.log('⚠️ Final price calculated manually:', finalPrice);
    }

    console.log('🔍 Final Price:', finalPrice);
    return this.roundToTwoDecimals(finalPrice);
  }

  canProceedToPayment(): boolean {
    return (
        !this.isProcessingPayment &&
        !this.isLoading &&
        !this.isValidatingCoupon &&
        this.acceptTerms?.value === true &&
        this.checkoutSummary !== null &&
        this.course !== null
    );
  }

  // ========== NAVIGATION ==========

  goBack(): void {
    if (this.courseId) {
      this.router.navigate(['/courses', this.courseId]);
    } else {
      this.router.navigate(['/courses']);
    }
  }

  goToCourse(): void {
    if (this.courseId) {
      this.router.navigate(['/courses', this.courseId]);
    } else {
      this.router.navigate(['/courses']);
    }
  }

  // ========== FORM GETTERS ==========

  get couponCode() {
    return this.couponForm.get('couponCode');
  }

  get acceptTerms() {
    return this.paymentForm.get('acceptTerms');
  }

  // ========== MESSAGE HANDLING ==========

  private setError(message: string): void {
    this.errorMessage = message;
    this.successMessage = null;
    this.warningMessage = null;
    this.isLoading = false;
    this.cdr.markForCheck();
  }

  private setSuccess(message: string): void {
    this.successMessage = message;
    this.errorMessage = null;
    this.warningMessage = null;
    this.cdr.markForCheck();
  }

  private setWarning(message: string): void {
    this.warningMessage = message;
    this.errorMessage = null;
    this.successMessage = null;
    this.cdr.markForCheck();
  }

  clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
    this.warningMessage = null;
    this.cdr.markForCheck();
  }

  // ========== HELPER METHODS ==========

  /**
   * Bileşen içinde kullanılan helper metodlar
   */
  private validateCheckoutData(): boolean {
    return !!(
        this.courseId &&
        this.currentUser?.id &&
        this.course &&
        this.checkoutSummary
    );
  }

  /**
   * Debug için checkout durumunu logla - Ukrainian version with circular reference protection
   */
  private logCheckoutState(): void {
    try {
      const state = {
        courseId: this.courseId,
        userId: this.currentUser?.id,
        course: !!this.course,
        coursePrice: this.course?.price,
        checkoutSummary: !!this.checkoutSummary,
        checkoutSummaryDetails: this.checkoutSummary ? {
          originalPrice: this.checkoutSummary.originalPrice,
          discountAmount: this.checkoutSummary.discountAmount,
          subtotal: this.checkoutSummary.subtotal,
          taxRate: this.checkoutSummary.taxRate,
          taxAmount: this.checkoutSummary.taxAmount,
          finalPrice: this.checkoutSummary.finalPrice,
          currency: this.checkoutSummary.currency
        } : null,
        calculatedValues: {
          originalPrice: `${this.getOriginalPrice()} UAH`,
          discountAmount: `${this.getDiscountAmount()} UAH`,
          subtotal: `${this.getSubtotal()} UAH`,
          taxAmount: `${this.getTaxAmount()} UAH (20% VAT)`,
          finalPrice: `${this.getFinalPrice()} UAH`
        },
        appliedCoupon: this.appliedCoupon ? {
          id: this.appliedCoupon.id,
          code: this.appliedCoupon.code,
          discountType: this.appliedCoupon.discountType,
          discountValue: this.appliedCoupon.discountValue,
          // instructor ve taughtCourses dahil edilmiyor
        } : null,
        isLoading: this.isLoading,
        canProceed: this.canProceedToPayment(),
        ukrainianVAT: '20%',
        currency: 'UAH',
        formStates: {
          couponFormValid: this.couponForm?.valid,
          paymentFormValid: this.paymentForm?.valid,
          termsAccepted: this.acceptTerms?.value
        }
      };

      console.log('🇺🇦 Ukrainian Checkout State Debug (Safe):', state);
    } catch (error) {
      console.error('❌ Error logging checkout state:', error);
    }
  }

  /**
   * Manual test için console'dan çağrılabilir - safe version
   */
  debugCheckout(): void {
    console.log('🔍 === UKRAINIAN CHECKOUT DEBUG START ===');
    this.logCheckoutState();

    // Kupon durumu
    if (this.appliedCoupon) {
      console.log('🎫 Applied Coupon (Safe):', {
        code: this.appliedCoupon.code,
        type: this.appliedCoupon.discountType,
        value: this.appliedCoupon.discountValue,
        valid: this.appliedCoupon.isActive
      });
    }

    // Form durumları
    console.log('📝 Form States:', {
      coupon: {
        value: this.couponCode?.value,
        valid: this.couponCode?.valid,
        errors: this.couponCode?.errors
      },
      payment: {
        termsAccepted: this.acceptTerms?.value,
        valid: this.paymentForm?.valid
      }
    });

    console.log('🔍 === UKRAINIAN CHECKOUT DEBUG END ===');
  }

  /**
   * Manual test için console'dan çağrılabilir
   */

}