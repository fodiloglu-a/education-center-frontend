// toast-notification.component.ts - REVIZE EDİLMİŞ

import { Component, OnInit, OnDestroy } from '@angular/core';
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
  NOTIFICATION_TYPE_COLORS,
  parseNotificationParams,
  hasTranslationKey
} from '../../models/notification.models';

/**
 * ToastNotificationComponent
 * Yeni bildirim geldiğinde ekranda toast olarak gösterir
 * Translation key desteği ile çok dilli bildirimler
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
  private readonly destroy$ = new Subject<void>();
  private readonly AUTO_CLOSE_DELAY = 5000; // 5 saniye
  private readonly MAX_TOASTS = 3; // Maksimum toast sayısı

  // State
  notifications: NotificationResponse[] = [];
  private autoCloseTimeouts = new Map<number, any>(); // Her toast için ayrı timeout

  constructor(
      private readonly notificationService: NotificationService,
      private readonly router: Router,
      private readonly translateService: TranslateService
  ) {}

  ngOnInit(): void {
    // Yeni bildirim geldiğinde dinle
    this.notificationService.newNotification$
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (notification) => {
            if (notification) {
              this.showToast(notification);
            }
          },
          error: (error) => {
            console.error('Error receiving new notification:', error);
          }
        });
  }

  ngOnDestroy(): void {
    this.clearAllTimeouts();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =================== TOAST YÖNETİMİ ===================

  /**
   * Toast gösterir
   * @param notification Gösterilecek bildirim
   */
  showToast(notification: NotificationResponse): void {
    // Aynı bildirimi tekrar gösterme
    if (this.isNotificationVisible(notification.id)) {
      console.warn(`Notification ${notification.id} already visible`);
      return;
    }

    // En fazla MAX_TOASTS kadar toast göster
    if (this.notifications.length >= this.MAX_TOASTS) {
      const oldest = this.notifications[0];
      this.closeToast(oldest);
    }

    this.notifications.push(notification);

    // Auto close timer (her toast için ayrı)
    const timeout = setTimeout(() => {
      this.closeToast(notification);
    }, this.AUTO_CLOSE_DELAY);

    this.autoCloseTimeouts.set(notification.id, timeout);
  }

  /**
   * Toast'ı kapatır
   * @param notification Kapatılacak bildirim
   */
  closeToast(notification: NotificationResponse): void {
    const index = this.notifications.findIndex(n => n.id === notification.id);

    if (index !== -1) {
      this.notifications.splice(index, 1);

      // Timeout'u temizle
      this.clearTimeout(notification.id);
    }
  }

  /**
   * Tüm toast'ları kapatır
   */
  closeAllToasts(): void {
    this.notifications = [];
    this.clearAllTimeouts();
  }

  /**
   * Bildirimin zaten görünür olup olmadığını kontrol eder
   */
  private isNotificationVisible(id: number): boolean {
    return this.notifications.some(n => n.id === id);
  }

  // =================== EVENT HANDLERS ===================

  /**
   * Toast'a tıklandığında
   * @param notification Tıklanan bildirim
   */
  onToastClick(notification: NotificationResponse): void {
    // Okunmamışsa okundu işaretle
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              console.log(`Notification ${notification.id} marked as read`);
            },
            error: (error) => {
              console.error('Error marking notification as read:', error);
            }
          });
    }

    // Toast'ı kapat
    this.closeToast(notification);

    // Action URL varsa oraya git
    if (notification.actionUrl && notification.actionUrl.trim()) {
      this.router.navigate([notification.actionUrl]);
    } else {
      // Action URL yoksa bildirimler sayfasına git
      this.router.navigate(['/profile'], { fragment: 'notifications' });
    }
  }

  /**
   * Close butonuna tıklandığında
   * @param notification Kapatılacak bildirim
   * @param event Click event
   */
  onCloseClick(notification: NotificationResponse, event: Event): void {
    event.stopPropagation();
    this.closeToast(notification);
  }

  // =================== TIMEOUT YÖNETİMİ ===================

  /**
   * Belirli bir timeout'u temizler
   */
  private clearTimeout(notificationId: number): void {
    const timeout = this.autoCloseTimeouts.get(notificationId);
    if (timeout) {
      clearTimeout(timeout);
      this.autoCloseTimeouts.delete(notificationId);
    }
  }

  /**
   * Tüm timeout'ları temizler
   */
  private clearAllTimeouts(): void {
    this.autoCloseTimeouts.forEach(timeout => clearTimeout(timeout));
    this.autoCloseTimeouts.clear();
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
   * Translation key kullanılıyor mu kontrol eder
   */
  hasTranslationKey(notification: NotificationResponse): boolean {
    return hasTranslationKey(notification);
  }

  /**
   * JSON params string'ini parse eder
   */
  parseParams(jsonParams: string | undefined | null): any {
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
    const classMap: Record<string, string> = {
      'HIGH': 'toast-priority-high',
      'MEDIUM': 'toast-priority-medium',
      'LOW': 'toast-priority-low'
    };
    return classMap[notification.priority] || 'toast-priority-medium';
  }

  /**
   * Toast animasyon state'i
   */
  getToastAnimationState(): string {
    return 'visible';
  }
}