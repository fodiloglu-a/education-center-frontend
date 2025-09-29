// toast-notification.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NotificationService } from '../../services/notification.service';
import { NotificationResponse } from '../../models/notification.models';
import { TranslateModule } from '@ngx-translate/core';
import { trigger, transition, style, animate } from '@angular/animations';

/**
 * ToastNotificationComponent
 * Yeni bildirim geldiğinde ekranda toast olarak gösterir
 */
@Component({
  selector: 'app-toast-notification',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './toast-notification.component.html',
  styleUrl: './toast-notification.component.css',
  animations: [
    trigger('toastAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(100%)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'translateX(100%)' }))
      ])
    ])
  ]
})
export class ToastNotificationComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // State
  notifications: NotificationResponse[] = [];
  private autoCloseTimeout: any;
  private readonly AUTO_CLOSE_DELAY = 5000; // 5 saniye

  constructor(
      private notificationService: NotificationService,
      private router: Router
  ) {}

  ngOnInit(): void {
    // Yeni bildirim geldiğinde dinle
    this.notificationService.newNotification$
        .pipe(takeUntil(this.destroy$))
        .subscribe(notification => {
          if (notification) {
            this.showToast(notification);
          }
        });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearAutoCloseTimeout();
  }

  /**
   * Toast gösterir
   */
  showToast(notification: NotificationResponse): void {
    // Aynı bildirimi tekrar gösterme
    const exists = this.notifications.some(n => n.id === notification.id);
    if (exists) {
      return;
    }

    // En fazla 3 toast göster
    if (this.notifications.length >= 3) {
      this.notifications.shift(); // İlk bildirimi kaldır
    }

    this.notifications.push(notification);

    // Auto close timer
    this.autoCloseTimeout = setTimeout(() => {
      this.closeToast(notification);
    }, this.AUTO_CLOSE_DELAY);
  }

  /**
   * Toast'ı kapatır
   */
  closeToast(notification: NotificationResponse): void {
    const index = this.notifications.findIndex(n => n.id === notification.id);
    if (index !== -1) {
      this.notifications.splice(index, 1);
    }
  }

  /**
   * Toast'a tıklandığında
   */
  onToastClick(notification: NotificationResponse): void {
    // Okunmamışsa okundu işaretle
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe();
    }

    // Toast'ı kapat
    this.closeToast(notification);

    // Action URL varsa oraya git
    if (notification.actionUrl) {
      this.router.navigate([notification.actionUrl]);
    } else {
      // Action URL yoksa bildirimler sayfasına git
      this.router.navigate(['/profile'], { fragment: 'notifications' });
    }
  }

  /**
   * Close butonuna tıklandığında
   */
  onCloseClick(notification: NotificationResponse, event: Event): void {
    event.stopPropagation();
    this.closeToast(notification);
  }

  /**
   * Auto close timeout'u temizler
   */
  private clearAutoCloseTimeout(): void {
    if (this.autoCloseTimeout) {
      clearTimeout(this.autoCloseTimeout);
      this.autoCloseTimeout = null;
    }
  }

  /**
   * Bildirim tipine göre icon döndürür
   */
  getNotificationIcon(notification: NotificationResponse): string {
    const iconMap: { [key: string]: string } = {
      'COURSE_PURCHASE': 'shopping_cart',
      'CERTIFICATE_EARNED': 'workspace_premium',
      'NEW_ENROLLMENT': 'person_add',
      'COURSE_COMPLETED': 'check_circle',
      'REVIEW_RECEIVED': 'rate_review',
      'SUBSCRIPTION_EXPIRING': 'schedule',
      'SUBSCRIPTION_EXPIRED': 'error_outline',
      'SYSTEM_ANNOUNCEMENT': 'campaign',
      'PAYMENT_SUCCESS': 'payment',
      'PAYMENT_FAILED': 'error',
      'COURSE_UPDATED': 'update',
      'NEW_LESSON_ADDED': 'library_add',
      'WELCOME': 'waving_hand'
    };
    return iconMap[notification.type] || 'notifications';
  }

  /**
   * Bildirim tipine göre renk döndürür
   */
  getNotificationColor(notification: NotificationResponse): string {
    const colorMap: { [key: string]: string } = {
      'COURSE_PURCHASE': '#4361ee',
      'CERTIFICATE_EARNED': '#ffb700',
      'NEW_ENROLLMENT': '#06d6a0',
      'COURSE_COMPLETED': '#10b981',
      'REVIEW_RECEIVED': '#8b5cf6',
      'SUBSCRIPTION_EXPIRING': '#fbbf24',
      'SUBSCRIPTION_EXPIRED': '#f72585',
      'SYSTEM_ANNOUNCEMENT': '#4cc9f0',
      'PAYMENT_SUCCESS': '#10b981',
      'PAYMENT_FAILED': '#f72585',
      'COURSE_UPDATED': '#6366f1',
      'NEW_LESSON_ADDED': '#06d6a0',
      'WELCOME': '#4361ee'
    };
    return colorMap[notification.type] || '#4361ee';
  }

  /**
   * Bildirim önceliğine göre CSS class döndürür
   */
  getPriorityClass(notification: NotificationResponse): string {
    const classMap: { [key: string]: string } = {
      'HIGH': 'toast-priority-high',
      'MEDIUM': 'toast-priority-medium',
      'LOW': 'toast-priority-low'
    };
    return classMap[notification.priority] || 'toast-priority-medium';
  }
}