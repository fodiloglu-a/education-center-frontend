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

  // Forms
  couponForm!: FormGroup;
  paymentForm!: FormGroup;

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

  // Constants
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
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.checkoutService.clearCheckoutState();
  }

  // ========== INITIALIZATION ==========

  private initializeForms(): void {
    // Coupon form
    this.couponForm = new FormGroup({
      couponCode: new FormControl('', [
        Validators.maxLength(50),
        Validators.pattern(/^[A-Za-z0-9-_]+$/)
      ])
    });

    // Terms checkbox form
    this.paymentForm = new FormGroup({
      acceptTerms: new FormControl(false, [Validators.requiredTrue])
    });

    this.setupCouponFormListeners();
  }

  private setupCouponFormListeners(): void {
    const couponCodeControl = this.couponForm.get('couponCode');

    if (couponCodeControl) {
      couponCodeControl.valueChanges.pipe(
          takeUntil(this.destroy$)
      ).subscribe(value => {
        if (!value || value.trim() === '') {
          if (this.appliedCoupon) {
            this.removeCoupon();
          }
        }
      });
    }
  }

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
    console.log('Loading checkout data for course:', this.courseId);

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
        console.error('User loading failed:', error);
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
        console.log('Course loaded:', course);
        this.course = course;
        this.createInitialCheckout();
      },
      error: (error) => {
        console.error('Course loading failed:', error);
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

    console.log('Creating checkout summary without tax');

    // Backend checkout summary endpoint call
    this.checkoutService.createCheckoutSummary(
        this.courseId,
        this.currentUser.id,
        undefined // no coupon initially
    ).pipe(
        takeUntil(this.destroy$)
    ).subscribe({
      next: (summary) => {
        console.log('Checkout summary from backend:', summary);
        this.checkoutSummary = summary;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Backend checkout failed, creating manual summary:', error);
        this.checkoutSummary = this.createManualCheckoutSummary();
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Create manual checkout summary without tax
   */
  private createManualCheckoutSummary(): CheckoutSummary {
    if (!this.course || !this.currentUser) {
      throw new Error('Cannot create manual checkout summary without course and user data');
    }

    const originalPrice = this.course.price;
    const discountAmount = 0;
    const finalPrice = originalPrice - discountAmount; // No tax added

    const summary: CheckoutSummary = {
      courseId: this.course.id,
      courseName: this.course.title,
      instructorId: this.course.instructorId,
      instructorName: this.course.instructorName || 'Unknown Instructor',
      originalPrice: this.roundToTwoDecimals(originalPrice),
      discountAmount: this.roundToTwoDecimals(discountAmount),
      finalPrice: this.roundToTwoDecimals(finalPrice),
      currency: this.CURRENCY,
      userId: this.currentUser.id
    };

    console.log('Manual checkout summary created without tax:', {
      originalPrice: `${originalPrice} UAH`,
      discountAmount: `${discountAmount} UAH`,
      finalPrice: `${finalPrice} UAH`
    });

    return summary;
  }

  /**
   * Round to two decimal places
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
    console.log('Validating coupon:', couponCode);

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
          console.log('Coupon valid:', response);

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
          console.log('Coupon invalid:', response);
          this.setError(response.message || 'Invalid coupon code');
          this.clearCouponInput();
        }

        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Coupon validation error:', error);
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

    console.log('Updating checkout with coupon:', couponCode);

    this.checkoutService.createCheckoutSummary(
        this.courseId,
        this.currentUser.id,
        couponCode
    ).pipe(
        takeUntil(this.destroy$)
    ).subscribe({
      next: (summary) => {
        console.log('Checkout updated with coupon from backend:', summary);
        this.checkoutSummary = summary;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Backend checkout with coupon failed, using manual calculation:', error);
        this.checkoutSummary = this.createManualCheckoutSummaryWithCoupon(couponCode);
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Create checkout summary with coupon (no tax)
   */
  private createManualCheckoutSummaryWithCoupon(couponCode: string): CheckoutSummary {
    if (!this.course || !this.currentUser || !this.appliedCoupon) {
      return this.createManualCheckoutSummary();
    }

    const originalPrice = this.course.price;
    let discountAmount = 0;

    // Calculate discount based on coupon type
    if (this.appliedCoupon.discountType === 'PERCENTAGE') {
      discountAmount = (originalPrice * this.appliedCoupon.discountValue) / 100;
    } else if (this.appliedCoupon.discountType === 'FIXED_AMOUNT') {
      discountAmount = this.appliedCoupon.discountValue;
    }

    // Apply constraints
    if (this.appliedCoupon.maximumDiscount && discountAmount > this.appliedCoupon.maximumDiscount) {
      discountAmount = this.appliedCoupon.maximumDiscount;
    }

    if (this.appliedCoupon.minimumAmount && originalPrice < this.appliedCoupon.minimumAmount) {
      discountAmount = 0;
    }

    const finalPrice = originalPrice - discountAmount; // No tax added

    const summary: CheckoutSummary = {
      courseId: this.course.id,
      courseName: this.course.title,
      instructorId: this.course.instructorId,
      instructorName: this.course.instructorName || 'Unknown Instructor',

      originalPrice: this.roundToTwoDecimals(originalPrice),
      coupon: this.appliedCoupon,
      discountAmount: this.roundToTwoDecimals(discountAmount),
      finalPrice: this.roundToTwoDecimals(finalPrice),
      currency: this.CURRENCY,
      userId: this.currentUser.id
    };

    console.log('Manual checkout summary with coupon created (no tax):', {
      originalPrice: `${originalPrice} UAH`,
      discountAmount: `${discountAmount} UAH`,
      finalPrice: `${finalPrice} UAH`,
      couponType: this.appliedCoupon.discountType,
      couponValue: this.appliedCoupon.discountValue
    });

    return summary;
  }

  removeCoupon(): void {
    console.log('Removing coupon');
    this.appliedCoupon = null;
    this.clearCouponInput();
    this.toggleCouponInput(false);
    this.createInitialCheckout();
    this.clearMessages();
    this.setSuccess('Coupon removed successfully');
  }

  private clearCouponInput(): void {
    this.couponForm.patchValue({ couponCode: '' }, { emitEvent: false });
    this.toggleCouponInput(false);
  }

  // ========== PAYMENT PROCESSING ==========

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
    console.log('Initiating LiqPay payment for course:', this.courseId);

    const discountAmount = this.getDiscountAmount();
    this.paymentService.initiatePayment(this.courseId, discountAmount).pipe(
        takeUntil(this.destroy$)
    ).subscribe({
      next: (response: PaymentResponse) => {
        console.log('LiqPay payment initiated:', response);

        this.isProcessingPayment = false;

        if (response.data && response.signature) {
          this.redirectToLiqPay(response);
        } else {
          this.setError('Invalid payment response. Please try again.');
        }

        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Payment initiation failed:', error);
        this.isProcessingPayment = false;
        this.setError(error.message || 'Payment processing failed. Please try again.');
        this.cdr.markForCheck();
      }
    });
  }

  private redirectToLiqPay(paymentResponse: PaymentResponse): void {
    console.log('Redirecting to LiqPay...');

    try {
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

      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);

    } catch (error) {
      console.error('LiqPay redirect failed:', error);
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
      return `${amount.toFixed(2)} ${this.CURRENCY}`;
    }
  }

  // ========== GETTERS ==========

  getOriginalPrice(): number {
    const price = this.checkoutSummary?.originalPrice || this.course?.price || 0;
    console.log('Original Price:', price);
    return price;
  }

  getDiscountAmount(): number {
    const discount = this.checkoutSummary?.discountAmount || 0;
    console.log('Discount Amount:', discount);
    return discount;
  }

  getFinalPrice(): number {
    let finalPrice = this.checkoutSummary?.finalPrice || 0;

    // If final price not calculated, calculate manually (no tax)
    if (finalPrice === 0) {
      finalPrice = this.getOriginalPrice() - this.getDiscountAmount();
      console.log('Final price calculated manually (no tax):', finalPrice);
    }

    console.log('Final Price:', finalPrice);
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

  private validateCheckoutData(): boolean {
    return !!(
        this.courseId &&
        this.currentUser?.id &&
        this.course &&
        this.checkoutSummary
    );
  }

  /**
   * Debug checkout state without tax calculations
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
          finalPrice: this.checkoutSummary.finalPrice,
          currency: this.checkoutSummary.currency
        } : null,
        calculatedValues: {
          originalPrice: `${this.getOriginalPrice()} UAH`,
          discountAmount: `${this.getDiscountAmount()} UAH`,
          finalPrice: `${this.getFinalPrice()} UAH (no tax)`
        },
        appliedCoupon: this.appliedCoupon ? {
          id: this.appliedCoupon.id,
          code: this.appliedCoupon.code,
          discountType: this.appliedCoupon.discountType,
          discountValue: this.appliedCoupon.discountValue
        } : null,
        isLoading: this.isLoading,
        canProceed: this.canProceedToPayment(),
        currency: 'UAH',
        noTax: true,
        formStates: {
          couponFormValid: this.couponForm?.valid,
          paymentFormValid: this.paymentForm?.valid,
          termsAccepted: this.acceptTerms?.value
        }
      };

      console.log('Checkout State Debug (No Tax):', state);
    } catch (error) {
      console.error('Error logging checkout state:', error);
    }
  }

  /**
   * Debug method for manual testing
   */
  debugCheckout(): void {
    console.log('=== CHECKOUT DEBUG START (NO TAX) ===');
    this.logCheckoutState();

    if (this.appliedCoupon) {
      console.log('Applied Coupon:', {
        code: this.appliedCoupon.code,
        type: this.appliedCoupon.discountType,
        value: this.appliedCoupon.discountValue,
        valid: this.appliedCoupon.isActive
      });
    }

    console.log('Form States:', {
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

    console.log('=== CHECKOUT DEBUG END ===');
  }
}