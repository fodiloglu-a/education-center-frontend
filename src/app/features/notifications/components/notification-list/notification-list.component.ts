// notification-list.component.ts - REVIZE EDİLMİŞ

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NotificationService } from '../../services/notification.service';
import {
  NotificationResponse,
  NOTIFICATION_TYPE_ICONS,
  NOTIFICATION_TYPE_COLORS,
  NOTIFICATION_PRIORITY_CLASSES,
  parseNotificationParams,
  hasTranslationKey
} from '../../models/notification.models';

/**
 * NotificationListComponent
 * Profile sayfasında gösterilen tam bildirim listesi
 * Translation key desteği ile çok dilli bildirimler
 */
@Component({
  selector: 'app-notification-list',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './notification-list.component.html',
  styleUrl: './notification-list.component.css'
})
export class NotificationListComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

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
      private readonly notificationService: NotificationService,
      private readonly router: Router,
      private readonly cdr: ChangeDetectorRef,
      private readonly translateService: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =================== DATA LOADING ===================

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

  // =================== FILTERING ===================

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

  // =================== NOTIFICATION ACTIONS ===================

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
              this.cdr.detectChanges();
            },
            error: (error) => {
              console.error('Error marking notification as read:', error);
            }
          });
    }

    // Action URL varsa oraya git
    if (notification.actionUrl && notification.actionUrl.trim()) {
      this.router.navigate([notification.actionUrl]);
    }
  }

  /**
   * Tüm bildirimleri okundu işaretler
   */
  markAllAsRead(): void {
    if (this.notifications.length === 0) {
      return;
    }

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

    const confirmMessage = this.translateService.instant('NOTIFICATION.CONFIRM_DELETE');
    if (!confirm(confirmMessage)) {
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
    if (this.notifications.length === 0) {
      return;
    }

    const confirmMessage = this.translateService.instant('NOTIFICATION.CONFIRM_CLEAR_ALL');
    if (!confirm(confirmMessage)) {
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
    if (this.notifications.length === 0) {
      return;
    }

    const confirmMessage = this.translateService.instant('NOTIFICATION.CONFIRM_CLEAR_READ');
    if (!confirm(confirmMessage)) {
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

  // =================== PAGINATION ===================

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

  // =================== TRANSLATION HELPERS ===================

  /**
   * Bildirim başlığını döndürür (translation key varsa translate eder)
   */
  getTitle(notification: NotificationResponse): string {
    if (hasTranslationKey(notification)) {
      const params = parseNotificationParams(notification.titleParams);
      return this.translateService.instant(notification.titleKey!, params);
    }
    return notification.title;
  }

  /**
   * Bildirim mesajını döndürür (translation key varsa translate eder)
   */
  getMessage(notification: NotificationResponse): string {
    if (notification.messageKey && notification.messageKey.trim()) {
      const params = parseNotificationParams(notification.messageParams);
      return this.translateService.instant(notification.messageKey, params);
    }
    return notification.message;
  }

  /**
   * JSON params string'ini parse eder
   */
  parseParams(jsonParams: string | undefined): any {
    return parseNotificationParams(jsonParams);
  }

  // =================== UI HELPERS ===================

  /**
   * Bildirim tipine göre icon döndürür
   */
  getNotificationIcon(notification: NotificationResponse): string {
    return NOTIFICATION_TYPE_ICONS[notification.type] || 'notifications';
  }

  /**
   * Bildirim tipine göre renk döndürür
   */
  getNotificationColor(notification: NotificationResponse): string {
    return NOTIFICATION_TYPE_COLORS[notification.type] || '#4361ee';
  }

  /**
   * Bildirim önceliğine göre CSS class döndürür
   */
  getPriorityClass(notification: NotificationResponse): string {
    return NOTIFICATION_PRIORITY_CLASSES[notification.priority] || 'priority-medium';
  }
}