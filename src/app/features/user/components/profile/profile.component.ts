// profile.component.ts - HTML Template ile Uyumlu Production Ready Version

import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  SecurityContext
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Meta, Title, DomSanitizer } from '@angular/platform-browser';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { UserService } from '../../services/user.service';
import { TokenService } from '../../../../core/services/token.service';
import { CourseService } from '../../../courses/services/course.service';
import { CertificateService } from '../../../certificates/services/certificate.service';
import { UserResponse } from '../../models/user.models';
import { CourseResponse } from '../../../courses/models/course.models';
import { CertificateResponse } from '../../../certificates/models/certificate.models';
import { catchError, finalize, timeout, takeUntil, retry } from 'rxjs/operators';
import { forkJoin, of, Subject, timer } from 'rxjs';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertDialogComponent } from '../../../../shared/components/alert-dialog/alert-dialog.component';
import { NotificationListComponent } from '../../../notifications/components/notification-list/notification-list.component';
import { ActivatedRoute } from '@angular/router';

// Constants
const COURSES_DISPLAY_LIMIT = 6;
const CERTIFICATES_DISPLAY_LIMIT = 4;
const API_TIMEOUT_MS = 15000;
const MAX_RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1000;

@Component({
  selector: 'app-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    LoadingSpinnerComponent,
    AlertDialogComponent,
    NotificationListComponent
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit, OnDestroy {
  // Lifecycle management
  private readonly destroy$ = new Subject<void>();

  // User data
  user: UserResponse | null = null;

  // Purchased courses data
  purchasedCourses: CourseResponse[] = [];

  // Certificates data
  userCertificates: CertificateResponse[] = [];

  // Loading states
  isLoading = false;
  isLoadingCourses = false;
  isLoadingCertificates = false;

  // Error handling
  errorMessage: string | null = null;
  successMessage: string | null = null;
  showRetryOption = false;
  retryCount = 0;

  // View states
  showAllCourses = false;
  showAllCertificates = false;
  showNotifications = true;

  constructor(
      private readonly userService: UserService,
      private readonly courseService: CourseService,
      private readonly certificateService: CertificateService,
      private readonly tokenService: TokenService,
      private readonly router: Router,
      protected readonly translate: TranslateService,
      private readonly cdr: ChangeDetectorRef,
      private readonly meta: Meta,
      private readonly title: Title,
      private readonly sanitizer: DomSanitizer,
      private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initializePageMetadata();
    this.loadUserProfile();

    // URL fragment kontrolü - bildirimler section'ına scroll
    this.route.fragment.subscribe(fragment => {
      if (fragment === 'notifications') {
        setTimeout(() => {
          const element = document.getElementById('notifications-section');
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 500);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Notifications section'ını toggle eder
   */
  toggleNotificationsSection(): void {
    this.showNotifications = !this.showNotifications;
    this.cdr.detectChanges();
  }

  /**
   * Sayfa meta verilerini ayarlar (SEO için)
   */
  private initializePageMetadata(): void {
    this.title.setTitle(this.translate.instant('PROFILE_PAGE_TITLE'));
    this.meta.updateTag({
      name: 'description',
      content: this.translate.instant('PROFILE_PAGE_DESCRIPTION')
    });
    this.meta.updateTag({
      name: 'robots',
      content: 'noindex, nofollow' // Profil sayfası index edilmemeli
    });
  }

  /**
   * Kullanıcı profil bilgilerini backend'den yükler
   */
  loadUserProfile(): void {
    this.resetLoadingState();

    const userId = this.getUserId();
    if (!userId) {
      this.handleUserIdError();
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    this.userService.getUserById(userId)
        .pipe(
            timeout(API_TIMEOUT_MS),
            retry({
              count: MAX_RETRY_ATTEMPTS,
              delay: (error, retryCount) => {
                this.retryCount = retryCount;
                return timer(RETRY_DELAY_MS * retryCount);
              }
            }),
            catchError(error => this.handleUserLoadError(error)),
            finalize(() => {
              this.isLoading = false;
              this.cdr.detectChanges();
            }),
            takeUntil(this.destroy$)
        )
        .subscribe(user => {
          if (user) {
            this.user = user;
            this.loadUserCoursesAndCertificates(userId);
            this.showRetryOption = false;
            this.retryCount = 0;
          }
        });
  }

  /**
   * Retry işlemi için method (HTML'de kullanılıyor)
   */
  retryLoadProfile(): void {
    this.loadUserProfile();
  }

  /**
   * Loading state'i sıfırlar
   */
  private resetLoadingState(): void {
    this.errorMessage = null;
    this.successMessage = null;
    this.showRetryOption = false;
  }

  /**
   * Token'dan user ID'yi alır
   */
  private getUserId(): number | null {
    try {
      const storedUser = this.tokenService.getStoredUser();
      return storedUser?.id || null;
    } catch (error) {
      console.error('Error getting stored user:', error);
      return null;
    }
  }

  /**
   * User ID bulunamadığında hata yönetimi
   */
  private handleUserIdError(): void {
    this.errorMessage = this.translate.instant('USER_ID_NOT_FOUND');
    this.showRetryOption = true;
    this.isLoading = false;

    // Token geçersizse çıkış yap
    setTimeout(() => {
      if (!this.tokenService.isTokenValid()) {
        this.tokenService.signOut();
        this.router.navigate(['/auth/login']);
      }
    }, 3000);

    this.cdr.detectChanges();
  }

  /**
   * User yükleme hatalarını yönetir
   */
  private handleUserLoadError(error: any) {
    console.error('Profile load error:', error);

    let errorMessage: string;

    if (error.name === 'TimeoutError') {
      errorMessage = this.translate.instant('CONNECTION_TIMEOUT');
    } else if (error.status === 401) {
      errorMessage = this.translate.instant('SESSION_EXPIRED');
      this.tokenService.signOut();
      this.router.navigate(['/auth/login']);
      return of(null);
    } else if (error.status === 403) {
      errorMessage = this.translate.instant('ACCESS_DENIED');
    } else if (error.status === 404) {
      errorMessage = this.translate.instant('USER_NOT_FOUND');
    } else if (error.status === 0) {
      errorMessage = this.translate.instant('NETWORK_ERROR');
    } else {
      errorMessage = error.message || this.translate.instant('PROFILE_LOAD_FAILED');
    }

    this.errorMessage = errorMessage;
    this.showRetryOption = true;

    return of(null);
  }

  /**
   * Kullanıcının satın aldığı kurslar ve sertifikalarını paralel yükler
   */
  private loadUserCoursesAndCertificates(userId: number): void {
    this.isLoadingCourses = true;
    this.isLoadingCertificates = true;
    this.cdr.detectChanges();

    forkJoin({
      courses: this.loadPurchasedCourses(userId),
      certificates: this.loadUserCertificates(userId)
    })
        .pipe(
            timeout(API_TIMEOUT_MS),
            finalize(() => {
              this.isLoadingCourses = false;
              this.isLoadingCertificates = false;
              this.cdr.detectChanges();
            }),
            takeUntil(this.destroy$)
        )
        .subscribe(({ courses, certificates }) => {
          this.purchasedCourses = courses || [];
          this.userCertificates = certificates || [];
          this.cdr.detectChanges();
        });
  }

  /**
   * Satın alınmış kursları yükler
   */
  private loadPurchasedCourses(userId: number) {
    return this.courseService.getPurchasedCoursesByUserId(userId)
        .pipe(
            retry(MAX_RETRY_ATTEMPTS),
            catchError(error => {
              console.error('Error loading purchased courses:', error);
              return of([]);
            }),
            takeUntil(this.destroy$)
        );
  }

  /**
   * Kullanıcı sertifikalarını yükler
   */
  private loadUserCertificates(userId: number) {
    return this.certificateService.getCertificatesByUserId(userId)
        .pipe(
            retry(MAX_RETRY_ATTEMPTS),
            catchError(error => {
              console.error('Error loading certificates:', error);
              return of([]);
            }),
            takeUntil(this.destroy$)
        );
  }

  /**
   * Kullanıcının rolünü yerelleştirilmiş olarak döndürür
   */
  getTranslatedRole(roleKey: string): string {
    if (!roleKey) return '';

    const roleTranslations: Record<string, string> = {
      'ROLE_USER': 'ROLE_LEARNER',
      'INSTRUCTOR': 'INSTRUCTOR',
      'ROLE_ADMIN': 'ROLE_ADMIN'
    };

    const translationKey = roleTranslations[roleKey] || roleKey;
    return this.translate.instant(translationKey);
  }

  /**
   * Fiyatı yerelleştirilmiş format ile döndürür
   */
  formatPrice(price: number): string {
    if (!price || price <= 0) {
      return this.translate.instant('FREE');
    }

    try {
      const currentLang = this.translate.currentLang || 'en';
      const locale = this.getLocaleForLanguage(currentLang);
      const currency = this.getCurrencyForLanguage(currentLang);

      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(price);
    } catch (error) {
      console.warn('Price formatting error:', error);
      return `$${price.toFixed(2)}`;
    }
  }

  /**
   * Dil için locale döndürür
   */
  private getLocaleForLanguage(lang: string): string {
    const localeMap: Record<string, string> = {
      'tr': 'tr-TR',
      'uk': 'uk-UA',
      'en': 'en-US'
    };
    return localeMap[lang] || 'en-US';
  }

  /**
   * Dil için para birimi döndürür (HTML template'de kullanılıyor)
   */
  getCurrencyForLanguage(lang: string): string {
    const currencyMap: Record<string, string> = {
      'tr': 'TRY',
      'uk': 'UAH',
      'en': 'USD'
    };
    return currencyMap[lang] || 'USD';
  }

  /**
   * Süreyi kullanıcı dostu formatta döndürür
   */
  formatDuration(minutes: number): string {
    if (!minutes || minutes <= 0) {
      return this.translate.instant('DURATION_NOT_SPECIFIED');
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0 && remainingMinutes > 0) {
      return this.translate.instant('DURATION_HOURS_MINUTES', {
        hours,
        minutes: remainingMinutes
      });
    } else if (hours > 0) {
      return this.translate.instant('DURATION_HOURS', { hours });
    } else {
      return this.translate.instant('DURATION_MINUTES', { minutes: remainingMinutes });
    }
  }

  /**
   * Kategoriyi yerelleştirilmiş olarak döndürür
   */
  getCategoryTranslation(category: string): string {
    if (!category) return '';
    return this.translate.instant(`CATEGORY.${category.toUpperCase()}`);
  }

  /**
   * Görüntülenecek kursları döndürür
   */
  getDisplayedCourses(): CourseResponse[] {
    if (!this.purchasedCourses?.length) return [];

    return this.showAllCourses
        ? this.purchasedCourses
        : this.purchasedCourses.slice(0, COURSES_DISPLAY_LIMIT);
  }

  /**
   * Görüntülenecek sertifikaları döndürür
   */
  getDisplayedCertificates(): CertificateResponse[] {
    if (!this.userCertificates?.length) return [];

    return this.showAllCertificates
        ? this.userCertificates
        : this.userCertificates.slice(0, CERTIFICATES_DISPLAY_LIMIT);
  }

  /**
   * Görüntülenmeyen kurs sayısını döndürür
   */
  getRemainingCoursesCount(): number {
    return Math.max(0, (this.purchasedCourses?.length || 0) - COURSES_DISPLAY_LIMIT);
  }

  /**
   * Görüntülenmeyen sertifika sayısını döndürür
   */
  getRemainingCertificatesCount(): number {
    return Math.max(0, (this.userCertificates?.length || 0) - CERTIFICATES_DISPLAY_LIMIT);
  }

  /**
   * Kursa güvenli şekilde yönlendirir
   */
  navigateToCourse(courseId: number): void {
    if (!courseId || courseId <= 0) {
      console.warn('Invalid course ID:', courseId);
      return;
    }

    this.router.navigate(['/courses', courseId]).catch(error => {
      console.error('Navigation error:', error);
      this.errorMessage = this.translate.instant('NAVIGATION_ERROR');
      this.cdr.detectChanges();
    });
  }

  /**
   * Sertifikaya güvenli şekilde yönlendirir
   */
  navigateToCertificate(certificateId: number): void {
    if (!certificateId || certificateId <= 0) {
      console.warn('Invalid certificate ID:', certificateId);
      return;
    }

    this.router.navigate(['/certificates', certificateId]).catch(error => {
      console.error('Navigation error:', error);
      this.errorMessage = this.translate.instant('NAVIGATION_ERROR');
      this.cdr.detectChanges();
    });
  }

  /**
   * Tüm kursları görüntüleme toggle
   */
  viewAllCourses(): void {
    if (this.purchasedCourses?.length <= COURSES_DISPLAY_LIMIT) {
      return;
    }

    this.showAllCourses = !this.showAllCourses;
    this.cdr.detectChanges();
  }

  /**
   * Tüm sertifikaları görüntüleme toggle
   */
  viewAllCertificates(): void {
    if (this.userCertificates?.length <= CERTIFICATES_DISPLAY_LIMIT) {
      return;
    }

    this.showAllCertificates = !this.showAllCertificates;
    this.cdr.detectChanges();
  }

  /**
   * Resim yükleme hatası için handler
   */
  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'assets/logo/Logo.png';
      target.onerror = null; // Sonsuz döngüyü önler
    }
  }

  /**
   * URL'yi güvenli hale getirir
   */
  sanitizeUrl(url: string): string {
    if (!url) return '';
    return this.sanitizer.sanitize(SecurityContext.URL, url) || '';
  }

  /**
   * Alert mesajlarını temizler
   */
  clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
    this.cdr.detectChanges();
  }

  /**
   * NgFor performance optimization için track function
   */
  trackByCourseId(index: number, course: CourseResponse): number {
    return course?.id || index;
  }

  /**
   * NgFor performance optimization için track function
   */
  trackByCertificateId(index: number, certificate: CertificateResponse): number {
    return certificate?.id || index;
  }

  /**
   * Kullanıcının premium üye olup olmadığını kontrol eder
   */
  get isPremiumUser(): boolean {
    return this.user?.role === 'PREMIUM_USER' || false;
  }

  /**
   * Kullanıcının kurs sayısına göre badge döndürür (HTML template'de kullanılıyor)
   */
  getUserBadge(): string {
    const courseCount = this.purchasedCourses?.length || 0;

    if (courseCount >= 50) return 'EXPERT_LEARNER';
    if (courseCount >= 20) return 'ADVANCED_LEARNER';
    if (courseCount >= 10) return 'INTERMEDIATE_LEARNER';
    if (courseCount >= 5) return 'ACTIVE_LEARNER';
    if (courseCount >= 1) return 'BEGINNER_LEARNER';

    return 'NEW_LEARNER';
  }

  /**
   * Component'in yükleme durumunu kontrol eder (HTML template'de kullanılıyor)
   */
  get isComponentLoading(): boolean {
    return this.isLoading || this.isLoadingCourses || this.isLoadingCertificates;
  }

  /**
   * Kullanıcının toplam öğrenme saatini hesaplar (HTML template'de kullanılıyor)
   */
  getTotalLearningHours(): number {
    if (!this.purchasedCourses?.length) return 0;

    return this.purchasedCourses.reduce((total, course) => {
      return total + (course.duration || 0);
    }, 0);
  }

  // ===== ARIA LABEL HELPER METHODS =====

  /**
   * Kurs sayısı için ARIA label
   */
  getCoursesCountAriaLabel(): string {
    const count = this.purchasedCourses?.length || 0;
    return this.translate.instant('COURSES_COUNT_ARIA', { count });
  }

  /**
   * Sertifika sayısı için ARIA label
   */
  getCertificatesCountAriaLabel(): string {
    const count = this.userCertificates?.length || 0;
    return this.translate.instant('CERTIFICATES_COUNT_ARIA', { count });
  }
  getCertificateCount(): number {
    return this.userCertificates?.length || 0;
  }
  getPurshCertificateCount(): number {
    return this.purchasedCourses?.length || 0;
  }

  /**
   * Kurs kartı için ARIA label
   */
  getCourseCardAriaLabel(title: string): string {
    return this.translate.instant('COURSE_CARD_ARIA', { title });
  }

  /**
   * Sertifika kartı için ARIA label
   */
  getCertificateCardAriaLabel(courseTitle: string): string {
    return this.translate.instant('CERTIFICATE_CARD_ARIA', { course: courseTitle });
  }

  /**
   * Kategori için ARIA label
   */
  getCategoryAriaLabel(category: string): string {
    const categoryText = this.getCategoryTranslation(category);
    return `${this.translate.instant('CATEGORY')} : ${categoryText}`;
  }

  /**
   * Süre için ARIA label
   */
  getDurationAriaLabel(duration: number): string {
    const durationText = this.formatDuration(duration);
    return `${this.translate.instant('DURATION')} : ${durationText}`;
  }

  /**
   * Fiyat için ARIA label
   */
  getPriceAriaLabel(price: number): string {
    const priceText = this.formatPrice(price);
    return `${this.translate.instant('PRICE')} : ${priceText}`;
  }

  /**
   * Yayın tarihi için ARIA label
   */
  getIssueDateAriaLabel(issueDate: string | Date): string {
    const dateText = new Date(issueDate).toLocaleDateString();
    return `${this.translate.instant('ISSUE_DATE')} : ${dateText}`;
  }

  /**
   * Sertifika kodu için ARIA label
   */
  getCertificateCodeAriaLabel(uniqueCode: string): string {
    return `${this.translate.instant('CERTIFICATE_CODE')} : ${uniqueCode}`;
  }

  /**
   * Sertifika görüntüleme için ARIA label
   */
  getViewCertificateAriaLabel(courseTitle: string): string {
    return `${this.translate.instant('VIEW_CERTIFICATE')} : ${courseTitle}`;
  }

  /**
   * Sertifika indirme için ARIA label
   */
  getDownloadCertificateAriaLabel(courseTitle: string): string {
    return `${this.translate.instant('DOWNLOAD_CERTIFICATE')} : ${courseTitle}`;
  }
  /**
   * Kullanıcının oturumunu kapatır.
   */
  logout(): void {
    this.tokenService.signOut();
    this.router.navigate(['/auth/login']);

  }
}