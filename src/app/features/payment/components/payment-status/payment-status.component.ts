// src/app/features/payment/components/payment-status/payment-status.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { PaymentService } from '../../services/payment.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertDialogComponent } from '../../../../shared/components/alert-dialog/alert-dialog.component';

@Component({
  selector: 'app-payment-status',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    LoadingSpinnerComponent
  ],
  template: `
    <div class="status-container">
      <div class="status-header">
        <h1>{{ 'PAYMENT_STATUS' | translate }}</h1>
      </div>
      
      <app-loading-spinner *ngIf="isLoading"></app-loading-spinner>
      
      <div class="status-content" *ngIf="!isLoading">
        <div class="status-card" [class]="statusClass">
          <div class="status-icon">
            <i [class]="statusIcon"></i>
          </div>
          
          <h2 class="status-title">{{ statusTitle | translate }}</h2>
          <p class="status-message">{{ statusMessage | translate }}</p>
          
          <div class="payment-details" *ngIf="paymentDetails">
            <div class="detail-item">
              <span class="label">{{ 'ORDER_ID' | translate }}:</span>
              <span class="value">{{ paymentDetails.orderId }}</span>
            </div>
            <div class="detail-item">
              <span class="label">{{ 'AMOUNT' | translate }}:</span>
              <span class="value">{{ paymentDetails.amount }} {{ paymentDetails.currency }}</span>
            </div>
            <div class="detail-item">
              <span class="label">{{ 'STATUS' | translate }}:</span>
              <span class="value status-badge" [class]="paymentDetails.status">
                {{ paymentDetails.status | translate }}
              </span>
            </div>
            <div class="detail-item" *ngIf="paymentDetails.transactionId">
              <span class="label">{{ 'TRANSACTION_ID' | translate }}:</span>
              <span class="value">{{ paymentDetails.transactionId }}</span>
            </div>
            <div class="detail-item" *ngIf="paymentDetails.paymentDate">
              <span class="label">{{ 'PAYMENT_DATE' | translate }}:</span>
              <span class="value">{{ paymentDetails.paymentDate | date:'medium' }}</span>
            </div>
          </div>
          
          <div class="action-buttons">
            <button 
              class="btn primary-btn" 
              (click)="goToCourse()"
              *ngIf="paymentDetails?.courseId && isSuccess">
              <i class="fas fa-play-circle"></i>
              {{ 'START_COURSE' | translate }}
            </button>
            
            <button 
              class="btn secondary-btn" 
              (click)="goToPayments()">
              <i class="fas fa-history"></i>
              {{ 'VIEW_PAYMENT_HISTORY' | translate }}
            </button>
            
            <button 
              class="btn outline-btn" 
              (click)="goToDashboard()">
              <i class="fas fa-tachometer-alt"></i>
              {{ 'DASHBOARD' | translate }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./payment-status.component.css']
})
export class PaymentStatusComponent implements OnInit {
  isLoading = true;
  orderId: string | null = null;
  paymentDetails: any = null;

  get statusClass(): string {
    if (!this.paymentDetails) return 'pending';
    return this.paymentDetails.status;
  }

  get statusIcon(): string {
    switch (this.paymentDetails?.status) {
      case 'success': return 'fas fa-check-circle';
      case 'failure': return 'fas fa-exclamation-circle';
      case 'processing': return 'fas fa-spinner fa-spin';
      default: return 'fas fa-clock';
    }
  }

  get statusTitle(): string {
    switch (this.paymentDetails?.status) {
      case 'success': return 'PAYMENT_SUCCESSFUL';
      case 'failure': return 'PAYMENT_FAILED';
      case 'processing': return 'PAYMENT_PROCESSING';
      default: return 'PAYMENT_PENDING';
    }
  }

  get statusMessage(): string {
    switch (this.paymentDetails?.status) {
      case 'success': return 'PAYMENT_SUCCESS_MESSAGE';
      case 'failure': return 'PAYMENT_FAILED_MESSAGE';
      case 'processing': return 'PAYMENT_PROCESSING_MESSAGE';
      default: return 'PAYMENT_PENDING_MESSAGE';
    }
  }

  get isSuccess(): boolean {
    return this.paymentDetails?.status === 'success';
  }

  constructor(
      private route: ActivatedRoute,
      private router: Router,
      private paymentService: PaymentService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.orderId = params.get('orderId');
      if (this.orderId) {
        this.checkPaymentStatus();
      } else {
        this.isLoading = false;
      }
    });
  }

  private checkPaymentStatus(): void {
    if (!this.orderId) return;

    this.paymentService.checkPaymentStatus(this.orderId)
        .subscribe({
          next: (response) => {
            this.paymentDetails = response;
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Error checking payment status:', error);
            this.isLoading = false;
          }
        });
  }

  goToCourse(): void {
    if (this.paymentDetails?.courseId) {
      this.router.navigate(['/courses', this.paymentDetails.courseId, 'learn']);
    }
  }

  goToPayments(): void {
    this.router.navigate(['/payments/history']);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}