// notification-bell.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NotificationService } from '../../services/notification.service';
import { NotificationResponse } from '../../models/notification.models';
import { TranslateModule } from '@ngx-translate/core';

/**
 * NotificationBellComponent
 * Header/Navbar'da gösterilen bildirim bell icon ve dropdown
 */
@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.css'
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // State
  unreadCount = 0;
  recentNotifications: NotificationResponse[] = [];
  isDropdownOpen = false;
  isLoading = false;

  constructor(
      private notificationService: NotificationService,
      private router: Router
  ) {}

  ngOnInit(): void {
    // Unread count'u subscribe et
    this.notificationService.unreadCount$
        .pipe(takeUntil(this.destroy$))
        .subscribe(count => {
          this.unreadCount = count;
        });

    // Yeni bildirim geldiğinde toast göster
    this.notificationService.newNotification$
        .pipe(takeUntil(this.destroy$))
        .subscribe(notification => {
          if (notification) {
            // Yeni bildirim geldi, recent notifications'ı yenile
            this.loadRecentNotifications();
          }
        });

    // Polling başlat
    this.notificationService.startPolling();

    // İlk yükleme
    this.loadRecentNotifications();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * En son 5 bildirimi yükler
   */
  loadRecentNotifications(): void {
    this.notificationService.getRecentNotifications()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.recentNotifications = response.notifications;
          },
          error: (error) => {
            console.error('Error loading recent notifications:', error);
          }
        });
  }

  /**
   * Dropdown'u toggle eder
   */
  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;

    if (this.isDropdownOpen) {
      // Dropdown açıldığında bildirimleri yenile
      this.loadRecentNotifications();
    }
  }

  /**
   * Dropdown'u kapatır
   */
  closeDropdown(): void {
    this.isDropdownOpen = false;
  }

  /**
   * Bildirime tıklandığında
   */
  onNotificationClick(notification: NotificationResponse): void {
    // Okunmamışsa okundu işaretle
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe();
    }

    // Dropdown'u kapat
    this.closeDropdown();

    // Action URL varsa oraya git
    if (notification.actionUrl) {
      this.router.navigate([notification.actionUrl]);
    }
  }

  /**
   * "Tümünü Gör" butonuna tıklandığında
   */
  viewAllNotifications(): void {
    this.closeDropdown();
    this.router.navigate(['/profile'], { fragment: 'notifications' });
  }

  /**
   * "Tümünü Okundu İşaretle" butonuna tıklandığında
   */
  markAllAsRead(): void {
    this.isLoading = true;
    this.notificationService.markAllAsRead()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadRecentNotifications();
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Error marking all as read:', error);
            this.isLoading = false;
          }
        });
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
   * Bildirim önceliğine göre CSS class döndürür
   */
  getPriorityClass(notification: NotificationResponse): string {
    const classMap: { [key: string]: string } = {
      'HIGH': 'priority-high',
      'MEDIUM': 'priority-medium',
      'LOW': 'priority-low'
    };
    return classMap[notification.priority] || 'priority-medium';
  }

  /**
   * Dropdown dışına tıklandığında kapat
   */
  onClickOutside(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-bell-container')) {
      this.closeDropdown();
    }
  }
}