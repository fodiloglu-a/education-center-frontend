// notification.service.ts - Angular Notification Service (REVIZE EDİLMİŞ)

import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, interval, Subject } from 'rxjs';
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
 * Translation key desteği ile çok dilli bildirim sistemi
 */
@Injectable({
    providedIn: 'root'
})
export class NotificationService implements OnDestroy {
    private readonly apiUrl = `${environment.apiUrl}/notifications`;
    private readonly pollingInterval = 30000; // 30 saniye

    // Okunmamış bildirim sayısı için BehaviorSubject
    private readonly unreadCountSubject = new BehaviorSubject<number>(0);
    public readonly unreadCount$ = this.unreadCountSubject.asObservable();

    // Yeni bildirim geldiğinde trigger için BehaviorSubject
    private readonly newNotificationSubject = new BehaviorSubject<NotificationResponse | null>(null);
    public readonly newNotification$ = this.newNotificationSubject.asObservable();

    // Polling kontrolü
    private isPolling = false;
    private readonly destroy$ = new Subject<void>();

    constructor(private readonly http: HttpClient) {}

    // =================== OKUMA METODLARI ===================

    /**
     * Kullanıcının tüm bildirimlerini getirir (sayfalı)
     * @param page Sayfa numarası (0'dan başlar)
     * @param size Sayfa başına kayıt sayısı
     */
    getUserNotifications(page: number = 0, size: number = 10): Observable<PaginatedNotificationResponse> {
        const params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());

        return this.http.get<PaginatedNotificationResponse>(this.apiUrl, { params })
            .pipe(
                catchError(this.handleError<PaginatedNotificationResponse>('getUserNotifications'))
            );
    }

    /**
     * Okunmamış bildirimleri getirir
     */
    getUnreadNotifications(): Observable<NotificationListResponse> {
        return this.http.get<NotificationListResponse>(`${this.apiUrl}/unread`)
            .pipe(
                catchError(this.handleError<NotificationListResponse>('getUnreadNotifications'))
            );
    }

    /**
     * Okunmamış bildirim sayısını getirir ve state'i günceller
     */
    getUnreadCount(): Observable<UnreadCountResponse> {
        return this.http.get<UnreadCountResponse>(`${this.apiUrl}/unread/count`)
            .pipe(
                tap(response => {
                    this.unreadCountSubject.next(response.count);
                }),
                catchError(this.handleError<UnreadCountResponse>('getUnreadCount'))
            );
    }

    /**
     * En son 5 bildirimi getirir
     */
    getRecentNotifications(): Observable<NotificationListResponse> {
        return this.http.get<NotificationListResponse>(`${this.apiUrl}/recent`)
            .pipe(
                catchError(this.handleError<NotificationListResponse>('getRecentNotifications'))
            );
    }

    /**
     * Yüksek öncelikli okunmamış bildirimleri getirir
     */
    getHighPriorityNotifications(): Observable<NotificationListResponse> {
        return this.http.get<NotificationListResponse>(`${this.apiUrl}/high-priority`)
            .pipe(
                catchError(this.handleError<NotificationListResponse>('getHighPriorityNotifications'))
            );
    }

    /**
     * Belirli bir bildirimi ID ile getirir
     * @param id Bildirim ID'si
     */
    getNotificationById(id: number): Observable<NotificationResponse> {
        if (!id || id <= 0) {
            throw new Error('Invalid notification ID');
        }

        return this.http.get<NotificationResponse>(`${this.apiUrl}/${id}`)
            .pipe(
                catchError(this.handleError<NotificationResponse>('getNotificationById'))
            );
    }

    // =================== GÜNCELLEME METODLARI ===================

    /**
     * Bildirimi okundu olarak işaretler
     * @param id Bildirim ID'si
     */
    markAsRead(id: number): Observable<NotificationActionResponse> {
        if (!id || id <= 0) {
            throw new Error('Invalid notification ID');
        }

        return this.http.put<NotificationActionResponse>(`${this.apiUrl}/${id}/read`, {})
            .pipe(
                tap(() => {
                    // Unread count'u güncelle
                    const currentCount = this.unreadCountSubject.value;
                    if (currentCount > 0) {
                        this.unreadCountSubject.next(currentCount - 1);
                    }
                }),
                catchError(this.handleError<NotificationActionResponse>('markAsRead'))
            );
    }

    /**
     * Tüm bildirimleri okundu olarak işaretler
     */
    markAllAsRead(): Observable<NotificationActionResponse> {
        return this.http.put<NotificationActionResponse>(`${this.apiUrl}/mark-all-read`, {})
            .pipe(
                tap((response) => {
                    // Count'u sıfırla
                    this.unreadCountSubject.next(0);
                }),
                catchError(this.handleError<NotificationActionResponse>('markAllAsRead'))
            );
    }

    // =================== SİLME METODLARI ===================

    /**
     * Bildirimi siler
     * @param id Bildirim ID'si
     */
    deleteNotification(id: number): Observable<NotificationActionResponse> {
        if (!id || id <= 0) {
            throw new Error('Invalid notification ID');
        }

        return this.http.delete<NotificationActionResponse>(`${this.apiUrl}/${id}`)
            .pipe(
                tap(() => {
                    // Unread count'u yenile (silinen bildirim okunmamış olabilir)
                    this.refreshUnreadCount();
                }),
                catchError(this.handleError<NotificationActionResponse>('deleteNotification'))
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
                }),
                catchError(this.handleError<NotificationActionResponse>('clearAllNotifications'))
            );
    }

    /**
     * Okunmuş bildirimleri temizler
     */
    clearReadNotifications(): Observable<NotificationActionResponse> {
        return this.http.delete<NotificationActionResponse>(`${this.apiUrl}/clear-read`)
            .pipe(
                tap(() => {
                    // Okunmamış count değişmemeli ama güvenlik için yenile
                    this.refreshUnreadCount();
                }),
                catchError(this.handleError<NotificationActionResponse>('clearReadNotifications'))
            );
    }

    // =================== HELPER METODLAR ===================

    /**
     * Okunmamış count'u yeniler
     */
    refreshUnreadCount(): void {
        this.getUnreadCount().subscribe({
            next: () => {
                // Count başarıyla güncellendi
            },
            error: (error) => {
                console.error('Error refreshing unread count:', error);
            }
        });
    }

    /**
     * Current unread count değerini döndürür (reactive olmayan)
     */
    getCurrentUnreadCount(): number {
        return this.unreadCountSubject.value;
    }

    // =================== POLLING METODLARI ===================

    /**
     * Polling başlatır (30 saniyede bir unread count kontrolü)
     * Kullanıcı giriş yaptıktan sonra başlatılmalı
     */
    startPolling(): void {
        if (this.isPolling) {
            console.warn('Polling already active');
            return;
        }

        console.log('Starting notification polling...');
        this.isPolling = true;

        // İlk yükleme
        this.refreshUnreadCount();

        // Her 30 saniyede bir kontrol et
        interval(this.pollingInterval)
            .pipe(
                takeUntil(this.destroy$),
                switchMap(() => this.getUnreadCount()),
                tap(response => {
                    const oldCount = this.unreadCountSubject.value;
                    const newCount = response.count;

                    // Yeni bildirim varsa
                    if (newCount > oldCount) {
                        console.log(`New notification detected: ${newCount - oldCount} new notification(s)`);

                        // En son bildirimleri getir ve ilkini göster
                        this.getRecentNotifications().subscribe({
                            next: (recentResponse) => {
                                if (recentResponse.notifications.length > 0) {
                                    const latestNotification = recentResponse.notifications[0];
                                    this.newNotificationSubject.next(latestNotification);
                                }
                            },
                            error: (error) => {
                                console.error('Error fetching recent notifications:', error);
                            }
                        });
                    }
                }),
                catchError((error) => {
                    console.error('Polling error:', error);
                    // Hata durumunda polling'i durdurma, devam et
                    return [];
                })
            )
            .subscribe();
    }

    /**
     * Polling durdurur
     * Kullanıcı çıkış yaptığında çağrılmalı
     */
    stopPolling(): void {
        if (this.isPolling) {
            console.log('Stopping notification polling...');
            this.isPolling = false;
            this.destroy$.next();
        }
    }

    /**
     * Polling aktif mi kontrolü
     */
    isPollingActive(): boolean {
        return this.isPolling;
    }

    // =================== ERROR HANDLING ===================

    /**
     * HTTP hatalarını yönetir
     */
    private handleError<T>(operation = 'operation') {
        return (error: any): Observable<T> => {
            console.error(`${operation} failed:`, error);

            // Kullanıcıya gösterilebilir hata mesajı
            let userMessage = 'Bir hata oluştu. Lütfen tekrar deneyin.';

            if (error.status === 401) {
                userMessage = 'Oturum süreniz doldu. Lütfen tekrar giriş yapın.';
            } else if (error.status === 403) {
                userMessage = 'Bu işlem için yetkiniz yok.';
            } else if (error.status === 404) {
                userMessage = 'Bildirim bulunamadı.';
            } else if (error.status === 0) {
                userMessage = 'Sunucuya bağlanılamıyor. İnternet bağlantınızı kontrol edin.';
            }

            // Error'u fırlat ki component'te yakalanabilsin
            throw new Error(userMessage);
        };
    }

    // =================== LIFECYCLE ===================

    /**
     * Service destroy edildiğinde
     */
    ngOnDestroy(): void {
        this.stopPolling();
        this.destroy$.complete();
        this.unreadCountSubject.complete();
        this.newNotificationSubject.complete();
    }
}