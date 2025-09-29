// notification-list.component.ts

import {Component, OnInit, OnDestroy, ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { NotificationService } from '../../services/notification.service';
import { NotificationResponse } from '../../models/notification.models';
import { TranslateModule } from '@ngx-translate/core';

/**
 * NotificationListComponent
 * Profile sayfasında gösterilen tam bildirim listesi
 */
@Component({
  selector: 'app-notification-list',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './notification-list.component.html',
  styleUrl: './notification-list.component.css'
})
export class NotificationListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // State
  notifications: NotificationResponse[] = [];
  filteredNotifications: NotificationResponse[] = [];
  currentFilter: 'all' | 'unread' | 'read' = 'all';
  isLoading = false;
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  totalItems = 0;

  constructor(
      private notificationService: NotificationService,
      private router: Router,
      private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Bildirimleri yükler
   */
  loadNotifications(): void {
    this.isLoading = true;

    this.notificationService.getUserNotifications(this.currentPage, this.pageSize)
        .pipe(
            takeUntil(this.destroy$),
            finalize(() => {
              this.isLoading = false;
              this.cdr.detectChanges();
            })
        )
        .subscribe({
          next: (response) => {
            this.notifications = response.notifications;
            this.currentPage = response.currentPage;
            this.totalPages = response.totalPages;
            this.totalItems = response.totalItems;
            this.applyFilter();
          },
          error: (error) => {
            console.error('Error loading notifications:', error);
          }
        });
  }

  /**
   * Filtre uygular
   */
  applyFilter(): void {
    if (this.currentFilter === 'all') {
      this.filteredNotifications = this.notifications;
    } else if (this.currentFilter === 'unread') {
      this.filteredNotifications = this.notifications.filter(n => !n.isRead);
    } else if (this.currentFilter === 'read') {
      this.filteredNotifications = this.notifications.filter(n => n.isRead);
    }
  }

  /**
   * Filtre değiştirir
   */
  changeFilter(filter: 'all' | 'unread' | 'read'): void {
    this.currentFilter = filter;
    this.applyFilter();
  }

  /**
   * Bildirime tıklandığında
   */
  onNotificationClick(notification: NotificationResponse): void {
    // Okunmamışsa okundu işaretle
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              notification.isRead = true;
              this.applyFilter();
            }
          });
    }

    // Action URL varsa oraya git
    if (notification.actionUrl) {
      this.router.navigate([notification.actionUrl]);
    }
  }

  /**
   * Tüm bildirimleri okundu işaretler
   */
  markAllAsRead(): void {
    this.isLoading = true;
    this.notificationService.markAllAsRead()
        .pipe(
            takeUntil(this.destroy$),
            finalize(() => {
              this.isLoading = false;
              this.cdr.detectChanges();
            })
        )
        .subscribe({
          next: () => {
            this.loadNotifications();
          },
          error: (error) => {
            console.error('Error marking all as read:', error);
          }
        });
  }

  /**
   * Bildirimi siler
   */
  deleteNotification(notification: NotificationResponse, event: Event): void {
    event.stopPropagation();

    if (!confirm('Bu bildirimi silmek istediğinizden emin misiniz?')) {
      return;
    }

    this.notificationService.deleteNotification(notification.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadNotifications();
          },
          error: (error) => {
            console.error('Error deleting notification:', error);
          }
        });
  }

  /**
   * Tüm bildirimleri temizler
   */
  clearAllNotifications(): void {
    if (!confirm('Tüm bildirimleri silmek istediğinizden emin misiniz?')) {
      return;
    }

    this.isLoading = true;
    this.notificationService.clearAllNotifications()
        .pipe(
            takeUntil(this.destroy$),
            finalize(() => {
              this.isLoading = false;
              this.cdr.detectChanges();
            })
        )
        .subscribe({
          next: () => {
            this.loadNotifications();
          },
          error: (error) => {
            console.error('Error clearing notifications:', error);
          }
        });
  }

  /**
   * Okunmuş bildirimleri temizler
   */
  clearReadNotifications(): void {
    if (!confirm('Okunmuş bildirimleri silmek istediğinizden emin misiniz?')) {
      return;
    }

    this.isLoading = true;
    this.notificationService.clearReadNotifications()
        .pipe(
            takeUntil(this.destroy$),
            finalize(() => {
              this.isLoading = false;
              this.cdr.detectChanges();
            })
        )
        .subscribe({
          next: () => {
            this.loadNotifications();
          },
          error: (error) => {
            console.error('Error clearing read notifications:', error);
          }
        });
  }

  /**
   * Sayfa değiştirir
   */
  changePage(page: number): void {
    if (page < 0 || page >= this.totalPages) {
      return;
    }
    this.currentPage = page;
    this.loadNotifications();
  }

  /**
   * Önceki sayfa
   */
  previousPage(): void {
    this.changePage(this.currentPage - 1);
  }

  /**
   * Sonraki sayfa
   */
  nextPage(): void {
    this.changePage(this.currentPage + 1);
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
      'HIGH': 'priority-high',
      'MEDIUM': 'priority-medium',
      'LOW': 'priority-low'
    };
    return classMap[notification.priority] || 'priority-medium';
  }
}