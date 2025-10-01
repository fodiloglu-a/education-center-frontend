// src/app/features/payment/components/payment-callback/payment-callback.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, finalize } from 'rxjs/operators';
import { of, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { PaymentService } from '../../services/payment.service';
import { CheckoutService } from '../../services/checkout.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertDialogComponent } from '../../../../shared/components/alert-dialog/alert-dialog.component';
import { LiqPayStatus } from '../../models/payment.models';

export enum PaymentType {
  COURSE_PURCHASE = 'COURSE_PURCHASE',
  SUBSCRIPTION = 'SUBSCRIPTION'
}

export interface PaymentCallbackResponse {
  success: boolean;
  paymentType: PaymentType;
  orderId: string;
  transactionId?: string;
  amount?: number;
  currency?: string;
  courseId?: number;
  courseName?: string;
  subscriptionPlanId?: number;
  subscriptionPlanName?: string;
  validUntil?: string;
  message?: string;
  errorCode?: string;
}

@Component({
  selector: 'app-payment-callback',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    LoadingSpinnerComponent,

  ],
  templateUrl: './payment-callback.component.html',
  styleUrls: ['./payment-callback.component.css']
})
export class PaymentCallbackComponent implements OnInit, OnDestroy {
  // State management
  isProcessing = true;
  isSuccess = false;
  paymentType: PaymentType | null = null;

  // Order details
  orderId: string | null = null;
  transactionId: string | null = null;
  amount: number | null = null;
  currency = 'UAH';

  // Course purchase specific
  courseId: number | null = null;
  courseName: string | null = null;

  // Subscription specific
  subscriptionPlanId: number | null = null;
  subscriptionPlanName: string | null = null;
  subscriptionValidUntil: string | null = null;

  // UI state
  statusIcon = 'fas fa-spinner fa-spin';
  statusTitle = 'PROCESSING_PAYMENT';
  statusMessage = 'PLEASE_WAIT_PROCESSING';
  statusSubtitle = '';

  // Animation state
  showConfetti = false;
  animateSuccess = false;

  // Error handling
  errorCode: string | null = null;
  retryAttempts = 0;
  maxRetryAttempts = 3;

  private destroy$ = new Subject<void>();

  constructor(
      private route: ActivatedRoute,
      private router: Router,
      private paymentService: PaymentService,
      private checkoutService: CheckoutService,
      private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.processCallback();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private processCallback(): void {
    this.route.queryParams
        .pipe(takeUntil(this.destroy$))
        .subscribe(params => {
          // Extract common parameters
          this.orderId = params['order_id'] || params['orderId'];
          this.transactionId = params['transaction_id'] || params['transactionId'];
          this.paymentType = params['payment_type'] || params['paymentType'];

          // Extract course purchase parameters
          this.courseId = params['course_id'] ? +params['course_id'] : null;
          this.courseName = params['course_name'] || params['courseName'];

          // Extract subscription parameters
          this.subscriptionPlanId = params['subscription_plan_id'] ? +params['subscription_plan_id'] : null;
          this.subscriptionPlanName = params['subscription_plan_name'] || params['subscriptionPlanName'];

          // Amount and currency
          this.amount = params['amount'] ? +params['amount'] : null;
          this.currency = params['currency'] || 'UAH';

          if (this.orderId) {
            this.verifyPayment();
          } else {
            this.handleError('NO_ORDER_ID', 'No order ID found in callback');
          }
        });
  }

  private verifyPayment(): void {
    if (this.retryAttempts >= this.maxRetryAttempts) {
      this.handleError('MAX_RETRY_EXCEEDED', 'Maximum retry attempts exceeded');
      return;
    }

    this.retryAttempts++;

    this.paymentService.verifyPayment(this.orderId!)
        .pipe(
            takeUntil(this.destroy$),
            catchError(error => {
              console.error('Payment verification failed:', error);

              // Check if we should retry
              if (this.retryAttempts < this.maxRetryAttempts &&
                  this.isRetryableError(error)) {
                setTimeout(() => this.verifyPayment(), 2000 * this.retryAttempts);
                return of(null);
              }

              this.handleError('VERIFICATION_FAILED', 'Payment verification failed');
              return of(null);
            }),
            finalize(() => {
              // Any cleanup logic
            })
        )
        .subscribe(response => {
          if (response?.success) {
            this.handleSuccess(response);
          } else if (response) {
            this.handleError(
                response.errorCode || 'PAYMENT_FAILED',
                response.message || 'Payment failed'
            );
          }
        });
  }

  private isRetryableError(error: any): boolean {
    // Network errors or 5xx errors are retryable
    const retryableCodes = [0, 500, 502, 503, 504];
    return !error.status || retryableCodes.includes(error.status);
  }

  private handleSuccess(response: PaymentCallbackResponse): void {
    this.isProcessing = false;
    this.isSuccess = true;
    this.animateSuccess = true;

    // Update payment type from response
    this.paymentType = response.paymentType || this.paymentType;

    // Update order details from response
    if (response.courseId) this.courseId = response.courseId;
    if (response.courseName) this.courseName = response.courseName;
    if (response.subscriptionPlanId) this.subscriptionPlanId = response.subscriptionPlanId;
    if (response.subscriptionPlanName) this.subscriptionPlanName = response.subscriptionPlanName;
    if (response.validUntil) this.subscriptionValidUntil = response.validUntil;
    if (response.amount) this.amount = response.amount;
    if (response.currency) this.currency = response.currency;

    // Set success UI state based on payment type
    this.statusIcon = 'fas fa-check-circle';

    if (this.paymentType === PaymentType.SUBSCRIPTION) {
      this.statusTitle = 'SUBSCRIPTION_SUCCESSFUL';
      this.statusMessage = 'SUBSCRIPTION_SUCCESS_MESSAGE';
      this.statusSubtitle = this.subscriptionPlanName || '';
    } else {
      this.statusTitle = 'PAYMENT_SUCCESSFUL';
      this.statusMessage = 'PAYMENT_SUCCESS_MESSAGE';
      this.statusSubtitle = this.courseName || '';
    }

    // Show confetti animation
    this.showConfetti = true;
    setTimeout(() => {
      this.showConfetti = false;
    }, 5000);

    // Clear checkout state
    this.checkoutService.clearCheckoutState();

    console.log('Payment successful:', response);
  }

  private handleError(errorCode: string, message: string): void {
    this.isProcessing = false;
    this.isSuccess = false;
    this.errorCode = errorCode;

    // Set error UI state
    this.statusIcon = 'fas fa-exclamation-circle';
    this.statusTitle = 'PAYMENT_FAILED';
    this.statusMessage = this.getErrorMessage(errorCode);
    this.statusSubtitle = message;

    console.error('Payment error:', { errorCode, message });
  }

  private getErrorMessage(errorCode: string): string {
    const errorMessages: { [key: string]: string } = {
      'NO_ORDER_ID': 'ERROR_NO_ORDER_ID',
      'VERIFICATION_FAILED': 'ERROR_VERIFICATION_FAILED',
      'PAYMENT_FAILED': 'ERROR_PAYMENT_FAILED',
      'PAYMENT_CANCELLED': 'ERROR_PAYMENT_CANCELLED',
      'INSUFFICIENT_FUNDS': 'ERROR_INSUFFICIENT_FUNDS',
      'CARD_DECLINED': 'ERROR_CARD_DECLINED',
      'EXPIRED_CARD': 'ERROR_EXPIRED_CARD',
      'INVALID_CARD': 'ERROR_INVALID_CARD',
      'MAX_RETRY_EXCEEDED': 'ERROR_MAX_RETRY_EXCEEDED',
      'NETWORK_ERROR': 'ERROR_NETWORK_ERROR'
    };

    return errorMessages[errorCode] || 'ERROR_UNKNOWN';
  }

  // Navigation methods
  goToCourse(): void {
    if (this.courseId) {
      this.router.navigate(['/courses', this.courseId, 'learn']);
    } else {
      this.router.navigate(['/courses']);
    }
  }

  goToMyCourses(): void {
    this.router.navigate(['/my-courses']);
  }

  goToCourses(): void {
    this.router.navigate(['/courses']);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  goToSubscriptionDashboard(): void {
    this.router.navigate(['/instructor/dashboard']);
  }

  goToCreateCourse(): void {
    this.router.navigate(['/instructor/courses/create']);
  }

  retryPayment(): void {
    if (this.paymentType === PaymentType.SUBSCRIPTION) {
      this.router.navigate(['/subscription/plans']);
    } else if (this.courseId) {
      this.router.navigate(['/payment/checkout', this.courseId]);
    } else {
      this.router.navigate(['/courses']);
    }
  }

  contactSupport(): void {
    this.router.navigate(['/support'], {
      queryParams: {
        orderId: this.orderId,
        errorCode: this.errorCode
      }
    });
  }

  // Helper methods for template
  get PaymentType() {
    return PaymentType;
  }

  get formattedAmount(): string {
    if (!this.amount) return '';
    return `${this.amount.toFixed(2)} ${this.currency}`;
  }

  get isCoursePurchase(): boolean {
    return this.paymentType === PaymentType.COURSE_PURCHASE;
  }

  get isSubscription(): boolean {
    return this.paymentType === PaymentType.SUBSCRIPTION;
  }
}