// notification.models.ts - GÜNCELLENMİŞ VERSİYON

/**
 * Backend'deki NotificationResponse DTO'suna karşılık gelen interface
 */
export interface NotificationResponse {
    id: number;
    userId: number;
    title: string;
    message: string;

    // Translation key alanları
    titleKey?: string;
    messageKey?: string;
    titleParams?: string;  // JSON string
    messageParams?: string; // JSON string

    type: NotificationType;
    isRead: boolean;
    createdAt: string;
    readAt: string | null;
    actionUrl: string | null;
    priority: NotificationPriority;
    typeDisplayName: string;
    priorityDisplayName: string;
    timeAgo: string;
}

/**
 * Parse edilmiş notification params interface
 */
export interface NotificationParams {
    [key: string]: string | number;
}

/**
 * Bildirim tipi enum
 */
export enum NotificationType {
    COURSE_PURCHASE = 'COURSE_PURCHASE',
    CERTIFICATE_EARNED = 'CERTIFICATE_EARNED',
    NEW_ENROLLMENT = 'NEW_ENROLLMENT',
    COURSE_COMPLETED = 'COURSE_COMPLETED',
    REVIEW_RECEIVED = 'REVIEW_RECEIVED',
    SUBSCRIPTION_EXPIRING = 'SUBSCRIPTION_EXPIRING',
    SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
    SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
    PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
    PAYMENT_FAILED = 'PAYMENT_FAILED',
    COURSE_UPDATED = 'COURSE_UPDATED',
    NEW_LESSON_ADDED = 'NEW_LESSON_ADDED',
    WELCOME = 'WELCOME'
}

/**
 * Bildirim önceliği enum
 */
export enum NotificationPriority {
    HIGH = 'HIGH',
    MEDIUM = 'MEDIUM',
    LOW = 'LOW'
}

/**
 * Sayfalı bildirim response'u
 */
export interface PaginatedNotificationResponse {
    notifications: NotificationResponse[];
    currentPage: number;
    totalItems: number;
    totalPages: number;
}

/**
 * Okunmamış bildirim sayısı response'u
 */
export interface UnreadCountResponse {
    count: number;
    hasUnread: boolean;
}

/**
 * Bildirim listesi response'u
 */
export interface NotificationListResponse {
    notifications: NotificationResponse[];
    count: number;
}

/**
 * Bildirim işlem response'u (mark as read, delete vb.)
 */
export interface NotificationActionResponse {
    message: string;
    notificationId?: string;
    markedCount?: number;
    deletedCount?: number;
}

/**
 * Bildirim tipine göre icon mapping
 */
export const NOTIFICATION_TYPE_ICONS: Record<NotificationType, string> = {
    [NotificationType.COURSE_PURCHASE]: 'shopping_cart',
    [NotificationType.CERTIFICATE_EARNED]: 'workspace_premium',
    [NotificationType.NEW_ENROLLMENT]: 'person_add',
    [NotificationType.COURSE_COMPLETED]: 'check_circle',
    [NotificationType.REVIEW_RECEIVED]: 'rate_review',
    [NotificationType.SUBSCRIPTION_EXPIRING]: 'schedule',
    [NotificationType.SUBSCRIPTION_EXPIRED]: 'error_outline',
    [NotificationType.SYSTEM_ANNOUNCEMENT]: 'campaign',
    [NotificationType.PAYMENT_SUCCESS]: 'payment',
    [NotificationType.PAYMENT_FAILED]: 'error',
    [NotificationType.COURSE_UPDATED]: 'update',
    [NotificationType.NEW_LESSON_ADDED]: 'library_add',
    [NotificationType.WELCOME]: 'waving_hand'
};

/**
 * Bildirim önceliğine göre CSS class mapping
 */
export const NOTIFICATION_PRIORITY_CLASSES: Record<NotificationPriority, string> = {
    [NotificationPriority.HIGH]: 'priority-high',
    [NotificationPriority.MEDIUM]: 'priority-medium',
    [NotificationPriority.LOW]: 'priority-low'
};

/**
 * Bildirim tipine göre renk mapping
 */
export const NOTIFICATION_TYPE_COLORS: Record<NotificationType, string> = {
    [NotificationType.COURSE_PURCHASE]: '#4361ee',
    [NotificationType.CERTIFICATE_EARNED]: '#ffb700',
    [NotificationType.NEW_ENROLLMENT]: '#06d6a0',
    [NotificationType.COURSE_COMPLETED]: '#10b981',
    [NotificationType.REVIEW_RECEIVED]: '#8b5cf6',
    [NotificationType.SUBSCRIPTION_EXPIRING]: '#fbbf24',
    [NotificationType.SUBSCRIPTION_EXPIRED]: '#f72585',
    [NotificationType.SYSTEM_ANNOUNCEMENT]: '#4cc9f0',
    [NotificationType.PAYMENT_SUCCESS]: '#10b981',
    [NotificationType.PAYMENT_FAILED]: '#f72585',
    [NotificationType.COURSE_UPDATED]: '#6366f1',
    [NotificationType.NEW_LESSON_ADDED]: '#06d6a0',
    [NotificationType.WELCOME]: '#4361ee'
};

// =================== YENİ HELPER FUNCTIONS ===================

/**
 * Notification'ın translation key kullanıp kullanmadığını kontrol eder
 */
export function hasTranslationKey(notification: NotificationResponse): boolean {
    return !!(notification.titleKey && notification.titleKey.trim());
}

/**
 * JSON params string'ini parse eder
 */
export function parseNotificationParams(jsonParams: string | undefined | null): NotificationParams {
    if (!jsonParams || jsonParams.trim() === '') {
        return {};
    }

    try {
        const parsed = JSON.parse(jsonParams);
        return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch (e) {
        console.error('Error parsing notification params:', jsonParams, e);
        return {};
    }
}

/**
 * Notification için title döndürür (translation key varsa onu, yoksa title'ı)
 */
export function getNotificationTitle(notification: NotificationResponse): string {
    if (hasTranslationKey(notification)) {
        return notification.titleKey!;
    }
    return notification.title;
}

/**
 * Notification için message döndürür (translation key varsa onu, yoksa message'ı)
 */
export function getNotificationMessage(notification: NotificationResponse): string {
    if (notification.messageKey && notification.messageKey.trim()) {
        return notification.messageKey;
    }
    return notification.message;
}