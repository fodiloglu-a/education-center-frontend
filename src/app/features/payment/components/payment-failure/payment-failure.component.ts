// src/app/features/payment/components/payment-failure/payment-failure.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-payment-failure',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule
  ],
  template: `
    <div class="failure-container">
      <div class="failure-content">
        <div class="failure-icon">
          <i class="fas fa-exclamation-circle"></i>
        </div>
        
        <h1 class="failure-title">{{ 'PAYMENT_FAILED' | translate }}</h1>
        
        <p class="failure-message">
          {{ errorMessage || ('PAYMENT_FAILED_DETAILS' | translate) }}
        </p>

        <div class="error-details" *ngIf="errorCode || orderId">
          <div class="detail-item" *ngIf="orderId">
            <span class="label">{{ 'ORDER_ID' | translate }}:</span>
            <span class="value">{{ orderId }}</span>
          </div>
          <div class="detail-item" *ngIf="errorCode">
            <span class="label">{{ 'ERROR_CODE' | translate }}:</span>
            <span class="value error-code">{{ errorCode }}</span>
          </div>
        </div>

        <div class="troubleshooting">
          <h3>{{ 'TROUBLESHOOTING_TIPS' | translate }}</h3>
          <ul>
            <li>
              <i class="fas fa-credit-card"></i>
              {{ 'CHECK_CARD_DETAILS' | translate }}
            </li>
            <li>
              <i class="fas fa-money-bill-wave"></i>
              {{ 'ENSURE_SUFFICIENT_FUNDS' | translate }}
            </li>
            <li>
              <i class="fas fa-wifi"></i>
              {{ 'CHECK_INTERNET_CONNECTION' | translate }}
            </li>
            <li>
              <i class="fas fa-sync-alt"></i>
              {{ 'TRY_AGAIN_LATER' | translate }}
            </li>
          </ul>
        </div>

        <div class="action-buttons">
          <button 
            class="btn primary-btn" 
            (click)="retryPayment()"
            *ngIf="courseId">
            <i class="fas fa-redo"></i>
            {{ 'RETRY_PAYMENT' | translate }}
          </button>
          
          <button 
            class="btn secondary-btn" 
            (click)="goToCheckout()"
            *ngIf="courseId">
            <i class="fas fa-shopping-cart"></i>
            {{ 'BACK_TO_CHECKOUT' | translate }}
          </button>
          
          <button 
            class="btn outline-btn" 
            (click)="goToCourses()">
            <i class="fas fa-book"></i>
            {{ 'BROWSE_COURSES' | translate }}
          </button>
        </div>

        <div class="support-info">
          <p>
            <i class="fas fa-life-ring"></i>
            {{ 'STILL_HAVING_TROUBLE' | translate }}
            <a href="/support" class="support-link">{{ 'CONTACT_SUPPORT' | translate }}</a>
            {{ 'OR_CALL' | translate }} <strong>+380 12 345 6789</strong>
          </p>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./payment-failure.component.css']
})
export class PaymentFailureComponent implements OnInit {
  orderId: string | null = null;
  courseId: number | null = null;
  errorCode: string | null = null;
  errorMessage: string | null = null;

  constructor(
      private route: ActivatedRoute,
      private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.orderId = params['orderId'] || params['order_id'];
      this.courseId = params['courseId'] ? +params['courseId'] : null;
      this.errorCode = params['errorCode'];
      this.errorMessage = params['errorMessage'];
    });
  }

  retryPayment(): void {
    if (this.courseId) {
      this.router.navigate(['payment/checkout', this.courseId]);
    }
  }

  goToCheckout(): void {
    if (this.courseId) {
      this.router.navigate(['payment/checkout', this.courseId]);
    }
  }

  goToCourses(): void {
    this.router.navigate(['/courses']);
  }
}