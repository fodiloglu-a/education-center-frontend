// src/app/features/payment/components/payment-history/payment-history.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import {
  PaymentService,
  PaymentHistoryResponse,
  PaymentStatsResponse
} from '../../services/payment.service';

@Component({
  selector: 'app-payment-history',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule
  ],
  templateUrl: './payment-history.component.html',
  styleUrls: ['./payment-history.component.css']
})
export class PaymentHistoryComponent implements OnInit, OnDestroy {
  payments: PaymentHistoryResponse[] = [];
  filteredPayments: PaymentHistoryResponse[] = [];

  // Filters
  statusFilter = 'all';
  dateFilter = 'all';
  searchQuery = '';

  // Loading and error states
  isLoading = true;
  errorMessage: string | null = null;

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;

  // Stats
  stats: PaymentStatsResponse = {
    successfulPayments: 0,
    totalPayments: 0,
    totalAmount: 0,
    failedPayments: 0,
    pendingPayments: 0,
    refundedPayments: 0
  };

  private destroy$ = new Subject<void>();

  constructor(
      public router: Router,
      private paymentService: PaymentService
  ) {}

  ngOnInit(): void {
    this.loadPaymentData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPaymentData(): void {
    this.isLoading = true;
    this.errorMessage = null;

    // Load stats and history in parallel
    this.loadPaymentStats();
    this.loadPaymentHistory();
  }

  private loadPaymentStats(): void {
    this.paymentService.getPaymentStats().pipe(
        takeUntil(this.destroy$)
    ).subscribe({
      next: (stats) => {
        this.stats = stats;
        console.log('Payment stats loaded:', stats);
      },
      error: (error) => {
        console.error('Failed to load payment stats:', error);
      }
    });
  }

  private loadPaymentHistory(): void {
    this.paymentService.getPaymentHistory({
      page: 0,
      size: 100
    }).pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
        })
    ).subscribe({
      next: (response) => {
        this.payments = response.content;
        this.filterPayments();
        console.log('Payment history loaded:', {
          total: response.totalElements,
          loaded: this.payments.length
        });
      },
      error: (error) => {
        console.error('Failed to load payment history:', error);
        this.errorMessage = error.message || 'FAILED_TO_LOAD_HISTORY';
        this.payments = [];
        this.filteredPayments = [];
      }
    });
  }

  filterPayments(): void {
    let filtered = [...this.payments];

    // Status filter
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(payment => payment.status === this.statusFilter);
    }

    // Date filter
    if (this.dateFilter !== 'all') {
      const now = new Date();
      let daysAgo = 0;

      switch (this.dateFilter) {
        case '7days': daysAgo = 7; break;
        case '30days': daysAgo = 30; break;
        case '90days': daysAgo = 90; break;
        case '180days': daysAgo = 180; break;
      }

      const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(payment => new Date(payment.paymentDate) >= cutoffDate);
    }

    // Search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(payment =>
          payment.courseTitle.toLowerCase().includes(query) ||
          payment.orderId.toLowerCase().includes(query) ||
          payment.transactionId?.toLowerCase().includes(query)
      );
    }

    this.filteredPayments = filtered;
    this.totalPages = Math.ceil(this.filteredPayments.length / this.itemsPerPage);
    this.currentPage = 1;
  }

  clearFilters(): void {
    this.statusFilter = 'all';
    this.dateFilter = 'all';
    this.searchQuery = '';
    this.filterPayments();
  }

  // Pagination
  get paginatedPayments(): PaymentHistoryResponse[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredPayments.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  // Actions
  viewCourse(courseId: number): void {
    this.router.navigate(['/courses', courseId, 'learn']);
  }

  downloadInvoice(payment: PaymentHistoryResponse): void {
    if (!payment.orderId) {
      console.error('No order ID for invoice download');
      return;
    }

    this.paymentService.downloadInvoice(payment.orderId).pipe(
        takeUntil(this.destroy$)
    ).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${payment.orderId}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        console.log('Invoice downloaded successfully');
      },
      error: (error) => {
        console.error('Failed to download invoice:', error);
        this.errorMessage = 'INVOICE_DOWNLOAD_FAILED';
      }
    });
  }

  retryPayment(payment: PaymentHistoryResponse): void {
    this.router.navigate(['/payment/checkout', payment.courseId]);
  }

  viewDetails(payment: PaymentHistoryResponse): void {
    this.router.navigate(['/payment/details', payment.orderId]);
  }

  requestRefund(payment: PaymentHistoryResponse): void {
    this.router.navigate(['/payment/refund', payment.orderId]);
  }

  // Utilities
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: 'UAH',
      minimumFractionDigits: 2
    }).format(amount);
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      success: 'fas fa-check-circle',
      failed: 'fas fa-times-circle',
      pending: 'fas fa-clock',
      refunded: 'fas fa-undo'
    };
    return icons[status] || 'fas fa-question-circle';
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      success: 'success',
      failed: 'error',
      pending: 'warning',
      refunded: 'info'
    };
    return colors[status] || 'default';
  }

  exportToCSV(): void {
    const csvData = this.filteredPayments.map(payment => ({
      'Order ID': payment.orderId,
      'Course': payment.courseTitle,
      'Amount': payment.amount,
      'Currency': payment.currency,
      'Status': payment.status,
      'Date': new Date(payment.paymentDate).toLocaleString('uk-UA'),
      'Payment Method': payment.paymentMethod,
      'Transaction ID': payment.transactionId || ''
    }));

    const csv = this.convertToCSV(csvData);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',')
              ? `"${value}"`
              : value;
        }).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  reload(): void {
    this.loadPaymentData();
  }
}