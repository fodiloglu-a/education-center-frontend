// src/app/features/payment/components/payment-history/payment-history.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {FormsModule} from "@angular/forms";

interface PaymentHistory {
  id: string;
  orderId: string;
  courseId: number;
  courseTitle: string;
  amount: number;
  currency: string;
  status: 'success' | 'failed' | 'pending' | 'refunded';
  paymentDate: string;
  paymentMethod: string;
  invoiceUrl?: string;
}

@Component({
  selector: 'app-payment-history',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule
  ],
  template: `
    <div class="history-container">
      <div class="history-header">
        <h1>{{ 'PAYMENT_HISTORY' | translate }}</h1>
        <p class="subtitle">{{ 'VIEW_YOUR_PAYMENT_HISTORY' | translate }}</p>
      </div>

      <div class="history-filters">
        <div class="filter-group">
          <label for="statusFilter">{{ 'FILTER_BY_STATUS' | translate }}:</label>
          <select id="statusFilter" [(ngModel)]="statusFilter" (change)="filterPayments()">
            <option value="all">{{ 'ALL_STATUSES' | translate }}</option>
            <option value="success">{{ 'SUCCESSFUL' | translate }}</option>
            <option value="failed">{{ 'FAILED' | translate }}</option>
            <option value="pending">{{ 'PENDING' | translate }}</option>
            <option value="refunded">{{ 'REFUNDED' | translate }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label for="dateFilter">{{ 'FILTER_BY_DATE' | translate }}:</label>
          <select id="dateFilter" [(ngModel)]="dateFilter" (change)="filterPayments()">
            <option value="all">{{ 'ALL_TIME' | translate }}</option>
            <option value="7days">{{ 'LAST_7_DAYS' | translate }}</option>
            <option value="30days">{{ 'LAST_30_DAYS' | translate }}</option>
            <option value="90days">{{ 'LAST_90_DAYS' | translate }}</option>
          </select>
        </div>
      </div>

      <div class="history-stats">
        <div class="stat-card">
          <div class="stat-icon success">
            <i class="fas fa-check-circle"></i>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ successfulPayments }}</div>
            <div class="stat-label">{{ 'SUCCESSFUL_PAYMENTS' | translate }}</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon total">
            <i class="fas fa-receipt"></i>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ totalPayments }}</div>
            <div class="stat-label">{{ 'TOTAL_PAYMENTS' | translate }}</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon amount">
            <i class="fas fa-coins"></i>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ totalAmount }} UAH</div>
            <div class="stat-label">{{ 'TOTAL_SPENT' | translate }}</div>
          </div>
        </div>
      </div>

      <div class="payments-list">
        <div class="payment-item" *ngFor="let payment of filteredPayments" 
             [class]="payment.status">
          <div class="payment-main">
            <div class="payment-info">
              <h3 class="course-title">{{ payment.courseTitle }}</h3>
              <div class="payment-details">
                <span class="order-id">#{{ payment.orderId }}</span>
                <span class="payment-date">{{ payment.paymentDate | date:'medium' }}</span>
                <span class="payment-method">{{ payment.paymentMethod }}</span>
              </div>
            </div>
            
            <div class="payment-amount">
              <div class="amount">{{ payment.amount }} {{ payment.currency }}</div>
              <div class="status-badge" [class]="payment.status">
                {{ ('STATUS.' + payment.status.toUpperCase()) | translate }}
              </div>
            </div>
          </div>

          <div class="payment-actions">
            <button 
              class="btn outline-btn small"
              (click)="viewCourse(payment.courseId)"
              *ngIf="payment.status === 'success'">
              <i class="fas fa-play"></i>
              {{ 'VIEW_COURSE' | translate }}
            </button>
            
            <button 
              class="btn outline-btn small"
              (click)="downloadInvoice(payment)"
              *ngIf="payment.invoiceUrl && payment.status === 'success'">
              <i class="fas fa-download"></i>
              {{ 'DOWNLOAD_INVOICE' | translate }}
            </button>
            
            <button 
              class="btn outline-btn small"
              (click)="retryPayment(payment)"
              *ngIf="payment.status === 'failed'">
              <i class="fas fa-redo"></i>
              {{ 'RETRY_PAYMENT' | translate }}
            </button>
            
            <button 
              class="btn outline-btn small"
              (click)="viewDetails(payment)">
              <i class="fas fa-info-circle"></i>
              {{ 'VIEW_DETAILS' | translate }}
            </button>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="filteredPayments.length === 0">
        <i class="fas fa-receipt"></i>
        <h3>{{ 'NO_PAYMENTS_FOUND' | translate }}</h3>
        <p>{{ 'NO_PAYMENTS_MATCH_FILTERS' | translate }}</p>
        <button class="btn primary-btn" (click)="clearFilters()">
          <i class="fas fa-times"></i>
          {{ 'CLEAR_FILTERS' | translate }}
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./payment-history.component.css']
})
export class PaymentHistoryComponent implements OnInit {
  payments: PaymentHistory[] = [];
  filteredPayments: PaymentHistory[] = [];

  statusFilter = 'all';
  dateFilter = 'all';

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.loadPaymentHistory();
  }

  private loadPaymentHistory(): void {
    // Mock data - gerçek uygulamada API'den alınacak
    this.payments = [
      {
        id: '1',
        orderId: 'ORD-001',
        courseId: 1,
        courseTitle: 'Angular Masterclass',
        amount: 299,
        currency: 'UAH',
        status: 'success',
        paymentDate: '2024-01-15T10:30:00Z',
        paymentMethod: 'LiqPay',
        invoiceUrl: '/invoices/ORD-001'
      },
      {
        id: '2',
        orderId: 'ORD-002',
        courseId: 2,
        courseTitle: 'React Advanced Patterns',
        amount: 199,
        currency: 'UAH',
        status: 'success',
        paymentDate: '2024-01-10T14:20:00Z',
        paymentMethod: 'LiqPay',
        invoiceUrl: '/invoices/ORD-002'
      },
      {
        id: '3',
        orderId: 'ORD-003',
        courseId: 3,
        courseTitle: 'Vue.js Composition API',
        amount: 149,
        currency: 'UAH',
        status: 'failed',
        paymentDate: '2024-01-08T09:15:00Z',
        paymentMethod: 'LiqPay'
      }
    ];

    this.filteredPayments = [...this.payments];
  }

  filterPayments(): void {
    this.filteredPayments = this.payments.filter(payment => {
      const statusMatch = this.statusFilter === 'all' || payment.status === this.statusFilter;

      let dateMatch = true;
      if (this.dateFilter !== 'all') {
        const paymentDate = new Date(payment.paymentDate);
        const now = new Date();
        let daysAgo = 0;

        switch (this.dateFilter) {
          case '7days': daysAgo = 7; break;
          case '30days': daysAgo = 30; break;
          case '90days': daysAgo = 90; break;
        }

        const cutoffDate = new Date(now.setDate(now.getDate() - daysAgo));
        dateMatch = paymentDate >= cutoffDate;
      }

      return statusMatch && dateMatch;
    });
  }

  clearFilters(): void {
    this.statusFilter = 'all';
    this.dateFilter = 'all';
    this.filteredPayments = [...this.payments];
  }

  get successfulPayments(): number {
    return this.payments.filter(p => p.status === 'success').length;
  }

  get totalPayments(): number {
    return this.payments.length;
  }

  get totalAmount(): number {
    return this.payments
        .filter(p => p.status === 'success')
        .reduce((sum, p) => sum + p.amount, 0);
  }

  viewCourse(courseId: number): void {
    this.router.navigate(['/courses', courseId, 'learn']);
  }

  downloadInvoice(payment: PaymentHistory): void {
    if (payment.invoiceUrl) {
      window.open(payment.invoiceUrl, '_blank');
    }
  }

  retryPayment(payment: PaymentHistory): void {
    this.router.navigate(['payment/checkout', payment.courseId]);
  }

  viewDetails(payment: PaymentHistory): void {
    this.router.navigate(['/payments/status', payment.orderId]);
  }
}