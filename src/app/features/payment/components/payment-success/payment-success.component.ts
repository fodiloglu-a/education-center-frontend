// src/app/features/payment/components/payment-success/payment-success.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { PaymentService, PaymentHistoryResponse } from '../../services/payment.service';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    RouterLink
  ],
  templateUrl: './payment-success.component.html',
  styleUrls: ['./payment-success.component.css']
})
export class PaymentSuccessComponent implements OnInit, OnDestroy {
  orderId: string | null = null;
  courseId: number | null = null;
  courseTitle: string | null = null;
  paymentDetails: PaymentHistoryResponse | null = null;

  isLoading = true;
  showConfetti = true;

  private destroy$ = new Subject<void>();

  constructor(
      private route: ActivatedRoute,
      private router: Router,
      private paymentService: PaymentService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.pipe(
        takeUntil(this.destroy$)
    ).subscribe(params => {
      this.orderId = params['orderId'] || params['order_id'];
      this.courseId = params['courseId'] || params['course_id'] ?
          +(params['courseId'] || params['course_id']) : null;
      this.courseTitle = params['courseTitle'] || params['course_title'];

      if (this.orderId) {
        this.loadPaymentDetails();
      } else {
        this.isLoading = false;
      }
    });

    // Hide confetti after 5 seconds
    setTimeout(() => {
      this.showConfetti = false;
    }, 5000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPaymentDetails(): void {
    if (!this.orderId) return;

    this.paymentService.getPaymentDetails(this.orderId).pipe(
        takeUntil(this.destroy$)
    ).subscribe({
      next: (details) => {
        this.paymentDetails = details;
        this.courseId = details.courseId || this.courseId;
        this.courseTitle = details.courseTitle || this.courseTitle;
        this.isLoading = false;
        console.log('Payment details loaded:', details);
      },
      error: (error) => {
        console.error('Error loading payment details:', error);
        this.isLoading = false;
      }
    });
  }

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

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  goToCourses(): void {
    this.router.navigate(['/courses']);
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
      },
      error: (error) => {
        console.error('Failed to download invoice:', error);
      }
    });
  }

  formatCurrency(amount: number | undefined): string {
    if (!amount && amount !== 0) return '0.00 UAH';

    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: 'UAH',
      minimumFractionDigits: 2
    }).format(amount);
  }
}