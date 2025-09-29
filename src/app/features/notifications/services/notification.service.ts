// notification.service.ts - Angular Notification Service

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { tap, catchError, switchMap, takeUntil } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  NotificationResponse,
  PaginatedNotificationResponse,
  UnreadCountResponse,
  NotificationListResponse,
  NotificationActionResponse
} from '../models/notification.models';

/**
 * NotificationService
 * Bildirim işlemlerini yöneten Angular servis
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = environment.apiUrl + '/notifications';

  // Okunmamış bildirim sayısı için BehaviorSubject
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  // Yeni bildirim geldiğinde trigger için BehaviorSubject
  private newNotificationSubject = new BehaviorSubject<NotificationResponse | null>(null);
  public newNotification$ = this.newNotificationSubject.asObservable();

  // Polling aktif mi?
  private isPolling = false;
  private pollingInterval = 30000; // 30 saniye

  constructor(private http: HttpClient) {}

  /**
   * Kullanıcının tüm bildirimlerini getirir (sayfalı)
   */
  getUserNotifications(page: number = 0, size: number = 10): Observable<PaginatedNotificationResponse> {
    const params = new HttpParams()
        .set('page', page.toString())
        .set('size', size.toString());

    return this.http.get<PaginatedNotificationResponse>(`${this.apiUrl}`, { params });
  }

  /**
   * Okunmamış bildirimleri getirir
   */
  getUnreadNotifications(): Observable<NotificationListResponse> {
    return this.http.get<NotificationListResponse>(`${this.apiUrl}/unread`);
  }

  /**
   * Okunmamış bildirim sayısını getirir
   */
  getUnreadCount(): Observable<UnreadCountResponse> {
    return this.http.get<UnreadCountResponse>(`${this.apiUrl}/unread/count`)
        .pipe(
            tap(response => {
              this.unreadCountSubject.next(response.count);
            })
        );
  }

  /**
   * En son 5 bildirimi getirir
   */
  getRecentNotifications(): Observable<NotificationListResponse> {
    return this.http.get<NotificationListResponse>(`${this.apiUrl}/recent`);
  }



  /**
   * Yüksek öncelikli okunmamış bildirimleri getirir
   */
  getHighPriorityNotifications(): Observable<NotificationListResponse> {
    return this.http.get<NotificationListResponse>(`${this.apiUrl}/high-priority`);
  }

  /**
   * Belirli bir bildirimi ID ile getirir
   */
  getNotificationById(id: number): Observable<NotificationResponse> {
    return this.http.get<NotificationResponse>(`${this.apiUrl}/${id}`);
  }

  /**
   * Bildirimi okundu olarak işaretler
   */
  markAsRead(id: number): Observable<NotificationActionResponse> {
    return this.http.put<NotificationActionResponse>(`${this.apiUrl}/${id}/read`, {})
        .pipe(
            tap(() => {
              // Unread count'u güncelle
              const currentCount = this.unreadCountSubject.value;
              if (currentCount > 0) {
                this.unreadCountSubject.next(currentCount - 1);
              }
            })
        );
  }

  /**
   * Tüm bildirimleri okundu olarak işaretler
   */
  markAllAsRead(): Observable<NotificationActionResponse> {
    return this.http.put<NotificationActionResponse>(`${this.apiUrl}/mark-all-read`, {})
        .pipe(
            tap(() => {
              this.unreadCountSubject.next(0);
            })
        );
  }

  /**
   * Bildirimi siler
   */
  deleteNotification(id: number): Observable<NotificationActionResponse> {
    return this.http.delete<NotificationActionResponse>(`${this.apiUrl}/${id}`)
        .pipe(
            tap(() => {
              // Eğer silinene bildirim okunmamışsa count'u azalt
              this.refreshUnreadCount();
            })
        );
  }

  /**
   * Tüm bildirimleri temizler
   */
  clearAllNotifications(): Observable<NotificationActionResponse> {
    return this.http.delete<NotificationActionResponse>(`${this.apiUrl}/clear-all`)
        .pipe(
            tap(() => {
              this.unreadCountSubject.next(0);
            })
        );
  }

  /**
   * Okunmuş bildirimleri temizler
   */
  clearReadNotifications(): Observable<NotificationActionResponse> {
    return this.http.delete<NotificationActionResponse>(`${this.apiUrl}/clear-read`);
  }

  /**
   * Okunmamış count'u yeniler
   */
  refreshUnreadCount(): void {
    this.getUnreadCount().subscribe();
  }

  /**
   * Polling başlatır (30 saniyede bir unread count kontrolü)
   */
  startPolling(): void {
    if (this.isPolling) {
      return; // Zaten aktif
    }

    this.isPolling = true;

    // İlk yükleme
    this.refreshUnreadCount();

    // Her 30 saniyede bir kontrol et
    interval(this.pollingInterval)
        .pipe(
            switchMap(() => this.getUnreadCount()),
            tap(response => {
              const oldCount = this.unreadCountSubject.value;
              const newCount = response.count;

              // Yeni bildirim varsa
              if (newCount > oldCount) {
                // En son bildirimleri getir ve ilkini göster
                this.getRecentNotifications().subscribe(recentResponse => {
                  if (recentResponse.notifications.length > 0) {
                    const latestNotification = recentResponse.notifications[0];
                    this.newNotificationSubject.next(latestNotification);
                  }
                });
              }
            }),
            catchError(error => {
              console.error('Polling error:', error);
              return [];
            })
        )
        .subscribe();
  }

  /**
   * Polling durdurur
   */
  stopPolling(): void {
    this.isPolling = false;
  }

  /**
   * Service destroy edildiğinde
   */
  ngOnDestroy(): void {
    this.stopPolling();
  }
}