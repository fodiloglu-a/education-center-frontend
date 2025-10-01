// src/app/features/payment/components/payment-failure/payment-failure.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface PaymentErrorDetail {
  code: string;
  title: string;
  description: string;
  icon: string;
  solutions: string[];
}

@Component({
  selector: 'app-payment-failure',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule
  ],
  templateUrl: './payment-failure.component.html',
  styleUrls: ['./payment-failure.component.css']
})
export class PaymentFailureComponent implements OnInit, OnDestroy {
  orderId: string | null = null;
  courseId: number | null = null;
  errorCode: string | null = null;
  errorMessage: string | null = null;
  transactionId: string | null = null;
  amount: number | null = null;
  currency = 'UAH';

  errorDetail: PaymentErrorDetail | null = null;

  // Common error codes mapping
  private readonly ERROR_DETAILS: { [key: string]: PaymentErrorDetail } = {
    'INSUFFICIENT_FUNDS': {
      code: 'INSUFFICIENT_FUNDS',
      title: 'ERROR_INSUFFICIENT_FUNDS_TITLE',
      description: 'ERROR_INSUFFICIENT_FUNDS_DESC',
      icon: 'fas fa-wallet',
      solutions: [
        'CHECK_ACCOUNT_BALANCE',
        'USE_DIFFERENT_CARD',
        'CONTACT_BANK_FOR_HELP'
      ]
    },
    'CARD_DECLINED': {
      code: 'CARD_DECLINED',
      title: 'ERROR_CARD_DECLINED_TITLE',
      description: 'ERROR_CARD_DECLINED_DESC',
      icon: 'fas fa-credit-card',
      solutions: [
        'VERIFY_CARD_DETAILS',
        'CHECK_CARD_EXPIRY',
        'CONTACT_CARD_ISSUER',
        'TRY_DIFFERENT_CARD'
      ]
    },
    'EXPIRED_CARD': {
      code: 'EXPIRED_CARD',
      title: 'ERROR_EXPIRED_CARD_TITLE',
      description: 'ERROR_EXPIRED_CARD_DESC',
      icon: 'fas fa-calendar-times',
      solutions: [
        'USE_VALID_CARD',
        'UPDATE_CARD_INFO',
        'CONTACT_BANK_FOR_REPLACEMENT'
      ]
    },
    'INVALID_CARD': {
      code: 'INVALID_CARD',
      title: 'ERROR_INVALID_CARD_TITLE',
      description: 'ERROR_INVALID_CARD_DESC',
      icon: 'fas fa-exclamation-triangle',
      solutions: [
        'CHECK_CARD_NUMBER',
        'VERIFY_CVV_CODE',
        'CHECK_EXPIRY_DATE',
        'TRY_DIFFERENT_CARD'
      ]
    },
    'PAYMENT_CANCELLED': {
      code: 'PAYMENT_CANCELLED',
      title: 'ERROR_PAYMENT_CANCELLED_TITLE',
      description: 'ERROR_PAYMENT_CANCELLED_DESC',
      icon: 'fas fa-times-circle',
      solutions: [
        'RETRY_PAYMENT',
        'COMPLETE_PAYMENT_PROCESS',
        'CONTACT_SUPPORT_IF_ISSUE'
      ]
    },
    'NETWORK_ERROR': {
      code: 'NETWORK_ERROR',
      title: 'ERROR_NETWORK_TITLE',
      description: 'ERROR_NETWORK_DESC',
      icon: 'fas fa-wifi',
      solutions: [
        'CHECK_INTERNET_CONNECTION',
        'TRY_AGAIN_SHORTLY',
        'USE_STABLE_NETWORK',
        'CONTACT_SUPPORT_IF_PERSISTS'
      ]
    },
    'LIMIT_EXCEEDED': {
      code: 'LIMIT_EXCEEDED',
      title: 'ERROR_LIMIT_EXCEEDED_TITLE',
      description: 'ERROR_LIMIT_EXCEEDED_DESC',
      icon: 'fas fa-ban',
      solutions: [
        'CHECK_DAILY_LIMIT',
        'CONTACT_BANK_INCREASE_LIMIT',
        'TRY_SMALLER_AMOUNT',
        'USE_DIFFERENT_PAYMENT_METHOD'
      ]
    },
    'SECURITY_VIOLATION': {
      code: 'SECURITY_VIOLATION',
      title: 'ERROR_SECURITY_TITLE',
      description: 'ERROR_SECURITY_DESC',
      icon: 'fas fa-shield-alt',
      solutions: [
        'VERIFY_YOUR_IDENTITY',
        'CONTACT_BANK_SECURITY',
        'USE_SECURE_CONNECTION',
        'CONTACT_SUPPORT'
      ]
    },
    'UNKNOWN_ERROR': {
      code: 'UNKNOWN_ERROR',
      title: 'ERROR_UNKNOWN_TITLE',
      description: 'ERROR_UNKNOWN_DESC',
      icon: 'fas fa-question-circle',
      solutions: [
        'TRY_AGAIN_LATER',
        'USE_DIFFERENT_PAYMENT_METHOD',
        'CONTACT_SUPPORT',
        'CHECK_SYSTEM_STATUS'
      ]
    }
  };

  private destroy$ = new Subject<void>();

  constructor(
      private route: ActivatedRoute,
      private router: Router
  ) {}

  ngOnInit(): void {
    this.loadErrorDetails();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadErrorDetails(): void {
    this.route.queryParams.pipe(
        takeUntil(this.destroy$)
    ).subscribe(params => {
      this.orderId = params['orderId'] || params['order_id'];
      this.courseId = params['courseId'] || params['course_id'] ?
          +(params['courseId'] || params['course_id']) : null;
      this.errorCode = params['errorCode'] || params['error_code'];
      this.errorMessage = params['errorMessage'] || params['error_message'];
      this.transactionId = params['transactionId'] || params['transaction_id'];
      this.amount = params['amount'] ? +params['amount'] : null;
      this.currency = params['currency'] || 'UAH';

      // Set error detail based on error code
      this.errorDetail = this.getErrorDetail(this.errorCode);

      console.log('Payment failure details:', {
        orderId: this.orderId,
        courseId: this.courseId,
        errorCode: this.errorCode,
        errorMessage: this.errorMessage
      });
    });
  }

  private getErrorDetail(errorCode: string | null): PaymentErrorDetail {
    if (!errorCode) {
      return this.ERROR_DETAILS['UNKNOWN_ERROR'];
    }

    const detail = this.ERROR_DETAILS[errorCode.toUpperCase()];
    return detail || this.ERROR_DETAILS['UNKNOWN_ERROR'];
  }

  // ========== NAVIGATION ==========

  retryPayment(): void {
    if (this.courseId) {
      this.router.navigate(['/payment/checkout', this.courseId]);
    } else {
      this.router.navigate(['/courses']);
    }
  }

  goToCheckout(): void {
    if (this.courseId) {
      this.router.navigate(['/payment/checkout', this.courseId]);
    } else {
      this.router.navigate(['/courses']);
    }
  }

  goToCourses(): void {
    this.router.navigate(['/courses']);
  }

  goToSupport(): void {
    this.router.navigate(['/support'], {
      queryParams: {
        orderId: this.orderId,
        errorCode: this.errorCode,
        type: 'payment_failure'
      }
    });
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  // ========== UTILITIES ==========

  formatCurrency(amount: number): string {
    if (isNaN(amount)) return '0.00 UAH';

    try {
      return new Intl.NumberFormat('uk-UA', {
        style: 'currency',
        currency: this.currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      return `${amount.toFixed(2)} ${this.currency}`;
    }
  }

  copyOrderId(): void {
    if (this.orderId) {
      navigator.clipboard.writeText(this.orderId).then(() => {
        console.log('Order ID copied to clipboard');
        // You can show a toast notification here
      }).catch(err => {
        console.error('Failed to copy order ID:', err);
      });
    }
  }

  // ========== HELPER METHODS ==========

  hasErrorDetails(): boolean {
    return !!(this.errorCode || this.orderId || this.transactionId);
  }

  getSolutionsCount(): number {
    return this.errorDetail?.solutions.length || 0;
  }
}