// src/app/features/payment/components/payment-callback/payment-callback.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { PaymentService } from '../../services/payment.service';
import { CheckoutService } from '../../services/checkout.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertDialogComponent } from '../../../../shared/components/alert-dialog/alert-dialog.component';

@Component({
  selector: 'app-payment-callback',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    LoadingSpinnerComponent,
    AlertDialogComponent
  ],
  template: `
    <div class="callback-container">
      <app-loading-spinner *ngIf="isProcessing"></app-loading-spinner>
      
      <div class="callback-content" *ngIf="!isProcessing">
        <div class="status-card" [class.success]="isSuccess" [class.error]="!isSuccess">
          <div class="status-icon">
            <i [class]="statusIcon"></i>
          </div>
          <h2 class="status-title">{{ statusTitle | translate }}</h2>
          <p class="status-message">{{ statusMessage | translate }}</p>
          
          <div class="order-details" *ngIf="orderId">
            <p><strong>{{ 'ORDER_ID' | translate }}:</strong> {{ orderId }}</p>
          </div>
          
          <div class="action-buttons">
            <button 
              class="btn primary-btn" 
              (click)="goToCourse()"
              *ngIf="isSuccess && courseId">
              <i class="fas fa-play-circle"></i>
              {{ 'START_LEARNING' | translate }}
            </button>
            
            <button 
              class="btn secondary-btn" 
              (click)="goToCourses()">
              <i class="fas fa-book"></i>
              {{ 'BROWSE_COURSES' | translate }}
            </button>
            
            <button 
              class="btn outline-btn" 
              (click)="goToDashboard()"
              *ngIf="isSuccess">
              <i class="fas fa-tachometer-alt"></i>
              {{ 'GO_TO_DASHBOARD' | translate }}
            </button>
            
            <button 
              class="btn primary-btn" 
              (click)="retryPayment()"
              *ngIf="!isSuccess">
              <i class="fas fa-redo"></i>
              {{ 'RETRY_PAYMENT' | translate }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./payment-callback.component.css']
})
export class PaymentCallbackComponent implements OnInit {
  isProcessing = true;
  isSuccess = false;
  orderId: string | null = null;
  courseId: number | null = null;
  statusIcon = 'fas fa-spinner fa-spin';
  statusTitle = 'PROCESSING_PAYMENT';
  statusMessage = 'PLEASE_WAIT_PROCESSING';

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

  private processCallback(): void {
    this.route.queryParams.subscribe(params => {
      this.orderId = params['order_id'] || params['orderId'];
      this.courseId = params['course_id'] ? +params['course_id'] : null;

      if (this.orderId) {
        this.verifyPayment();
      } else {
        this.handleError('No order ID found in callback');
      }
    });
  }

  private verifyPayment(): void {
    this.paymentService.verifyPayment(this.orderId!)
        .pipe(
            catchError(error => {
              console.error('Payment verification failed:', error);
              this.handleError('Payment verification failed');
              return of(null);
            })
        )
        .subscribe(response => {
          if (response?.success) {
            this.handleSuccess(response);
          } else {
            this.handleError(response?.message || 'Payment failed');
          }
        });
  }

  private handleSuccess(response: any): void {
    this.isProcessing = false;
    this.isSuccess = true;
    this.statusIcon = 'fas fa-check-circle';
    this.statusTitle = 'PAYMENT_SUCCESSFUL';
    this.statusMessage = 'PAYMENT_SUCCESS_MESSAGE';

    // Clear checkout state
    this.checkoutService.clearCheckoutState();

    console.log('Payment successful:', response);
  }

  private handleError(message: string): void {
    this.isProcessing = false;
    this.isSuccess = false;
    this.statusIcon = 'fas fa-exclamation-circle';
    this.statusTitle = 'PAYMENT_FAILED';
    this.statusMessage = message;

    console.error('Payment error:', message);
  }

  goToCourse(): void {
    if (this.courseId) {
      this.router.navigate(['/courses', this.courseId, 'learn']);
    } else {
      this.router.navigate(['/courses']);
    }
  }

  goToCourses(): void {
    this.router.navigate(['/courses']);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  retryPayment(): void {
    if (this.courseId) {
      this.router.navigate(['payment/checkout', this.courseId]);
    } else {
      this.router.navigate(['/courses']);
    }
  }
}