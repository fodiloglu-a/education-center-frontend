// notification-bell.component.ts - REVIZE EDİLMİŞ

import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { NotificationService } from '../../services/notification.service';
import {
  NotificationResponse,
  NOTIFICATION_TYPE_ICONS,
  NOTIFICATION_PRIORITY_CLASSES,
  parseNotificationParams,
  hasTranslationKey
} from '../../models/notification.models';

/**
 * NotificationBellComponent
 * Header/Navbar'da gösterilen bildirim bell icon ve dropdown
 * Translation key desteği ile çok dilli bildirimler
 */
@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.css',
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)' }))
      ])
    ])
  ]
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  // State
  unreadCount = 0;
  recentNotifications: NotificationResponse[] = [];
  isDropdownOpen = false;
  isLoading = false;

  constructor(
      private readonly notificationService: NotificationService,
      private readonly router: Router,
      private readonly translateService: TranslateService
  ) {}

  ngOnInit(): void {
    // Unread count'u subscribe et
    this.notificationService.unreadCount$
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (count) => {
            this.unreadCount = count;
          }
        });

    // Yeni bildirim geldiğinde recent notifications'ı yenile
    this.notificationService.newNotification$
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (notification) => {
            if (notification) {
              this.loadRecentNotifications();
            }
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

  // =================== DATA LOADING ===================

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

  // =================== DROPDOWN CONTROL ===================

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
   * Dropdown dışına tıklandığında kapat
   */
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-bell-container')) {
      this.closeDropdown();
    }
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
            error: (error) => {
              console.error('Error marking notification as read:', error);
            }
          });
    }

    // Dropdown'u kapat
    this.closeDropdown();

    // Action URL varsa oraya git
    if (notification.actionUrl && notification.actionUrl.trim()) {
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
    if (this.unreadCount === 0) {
      return;
    }

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
   * Bildirim önceliğine göre CSS class döndürür
   */
  getPriorityClass(notification: NotificationResponse): string {
    return NOTIFICATION_PRIORITY_CLASSES[notification.priority] || 'priority-medium';
  }

  /**
   * Unread count display formatı
   */
  getUnreadCountDisplay(): string {
    return this.unreadCount > 99 ? '99+' : this.unreadCount.toString();
  }
}