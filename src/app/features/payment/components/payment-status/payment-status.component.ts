// src/app/features/payment/components/payment-status/payment-status.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, interval } from 'rxjs';
import { takeUntil, switchMap, take } from 'rxjs/operators';

import { PaymentService, PaymentHistoryResponse } from '../../services/payment.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-payment-status',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    LoadingSpinnerComponent,
    RouterLink
  ],
  templateUrl: './payment-status.component.html',
  styleUrls: ['./payment-status.component.css']
})
export class PaymentStatusComponent implements OnInit, OnDestroy {
  isLoading = true;
  orderId: string | null = null;
  paymentDetails: PaymentHistoryResponse | null = null;
  errorMessage: string | null = null;

  // Auto-refresh for pending payments
  private refreshAttempts = 0;
  private maxRefreshAttempts = 10;
  private refreshInterval = 3000; // 3 seconds

  private destroy$ = new Subject<void>();

  constructor(
      private route: ActivatedRoute,
      private router: Router,
      private paymentService: PaymentService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(
        takeUntil(this.destroy$)
    ).subscribe(params => {
      this.orderId = params.get('orderId');
      if (this.orderId) {
        this.loadPaymentDetails();
      } else {
        this.isLoading = false;
        this.errorMessage = 'NO_ORDER_ID';
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPaymentDetails(): void {
    if (!this.orderId) return;

    this.isLoading = true;
    this.errorMessage = null;

    this.paymentService.getPaymentDetails(this.orderId).pipe(
        takeUntil(this.destroy$)
    ).subscribe({
      next: (details) => {
        this.paymentDetails = details;
        this.isLoading = false;

        // If payment is pending, start auto-refresh
        if (details.status === 'pending' && this.refreshAttempts < this.maxRefreshAttempts) {
          this.startAutoRefresh();
        }

        console.log('Payment details loaded:', details);
      },
      error: (error) => {
        console.error('Error loading payment details:', error);
        this.errorMessage = error.message || 'FAILED_TO_LOAD_PAYMENT_DETAILS';
        this.isLoading = false;
      }
    });
  }

  private startAutoRefresh(): void {
    console.log('Starting auto-refresh for pending payment');

    interval(this.refreshInterval).pipe(
        take(this.maxRefreshAttempts - this.refreshAttempts),
        switchMap(() => {
          this.refreshAttempts++;
          return this.paymentService.getPaymentDetails(this.orderId!);
        }),
        takeUntil(this.destroy$)
    ).subscribe({
      next: (details) => {
        this.paymentDetails = details;

        // Stop refreshing if status changed from pending
        if (details.status !== 'pending') {
          console.log('Payment status updated to:', details.status);
          this.destroy$.next();
        }
      },
      error: (error) => {
        console.error('Error during auto-refresh:', error);
      }
    });
  }

  // Computed properties
  get statusClass(): string {
    if (!this.paymentDetails) return 'pending';
    return this.paymentDetails.status;
  }

  get statusIcon(): string {
    const icons: { [key: string]: string } = {
      success: 'fas fa-check-circle',
      failed: 'fas fa-times-circle',
      pending: 'fas fa-clock',
      refunded: 'fas fa-undo'
    };
    return icons[this.paymentDetails?.status || 'pending'] || 'fas fa-question-circle';
  }

  get statusTitle(): string {
    const titles: { [key: string]: string } = {
      success: 'PAYMENT_SUCCESSFUL',
      failed: 'PAYMENT_FAILED',
      pending: 'PAYMENT_PENDING',
      refunded: 'PAYMENT_REFUNDED'
    };
    return titles[this.paymentDetails?.status || 'pending'] || 'PAYMENT_STATUS_UNKNOWN';
  }

  get statusMessage(): string {
    const messages: { [key: string]: string } = {
      success: 'PAYMENT_SUCCESS_MESSAGE',
      failed: 'PAYMENT_FAILED_MESSAGE',
      pending: 'PAYMENT_PENDING_MESSAGE',
      refunded: 'PAYMENT_REFUNDED_MESSAGE'
    };
    return messages[this.paymentDetails?.status || 'pending'] || 'PAYMENT_STATUS_UNKNOWN_MESSAGE';
  }

  get isSuccess(): boolean {
    return this.paymentDetails?.status === 'success';
  }

  get isFailed(): boolean {
    return this.paymentDetails?.status === 'failed';
  }

  get isPending(): boolean {
    return this.paymentDetails?.status === 'pending';
  }

  get isRefunded(): boolean {
    return this.paymentDetails?.status === 'refunded';
  }

  // Navigation methods
  goToCourse(): void {
    if (this.paymentDetails?.courseId) {
      this.router.navigate(['/courses', this.paymentDetails.courseId, 'learn']);
    }
  }

  goToPaymentHistory(): void {
    this.router.navigate(['/payment/history']);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  retryPayment(): void {
    if (this.paymentDetails?.courseId) {
      this.router.navigate(['/payment/checkout', this.paymentDetails.courseId]);
    } else {
      this.router.navigate(['/courses']);
    }
  }

  downloadInvoice(): void {
    if (!this.orderId) return;

    this.paymentService.downloadInvoice(this.orderId).pipe(
        takeUntil(this.destroy$)
    ).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${this.orderId}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        console.log('Invoice downloaded');
      },
      error: (error) => {
        console.error('Failed to download invoice:', error);
        this.errorMessage = 'INVOICE_DOWNLOAD_FAILED';
      }
    });
  }

  contactSupport(): void {
    this.router.navigate(['/support'], {
      queryParams: {
        orderId: this.orderId,
        subject: 'payment_issue'
      }
    });
  }

  refreshStatus(): void {
    this.loadPaymentDetails();
  }

  // Utility methods
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: 'UAH',
      minimumFractionDigits: 2
    }).format(amount);
  }
}