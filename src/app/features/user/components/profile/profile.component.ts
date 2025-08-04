// profile.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { UserService } from '../../services/user.service';
import { TokenService } from '../../../../core/services/token.service';
import { CourseService } from '../../../courses/services/course.service';
import { CertificateService } from '../../../certificates/services/certificate.service';
import { UserResponse } from '../../models/user.models';
import { CourseResponse } from '../../../courses/models/course.models';
import { CertificateResponse } from '../../../certificates/models/certificate.models';
import { catchError, finalize } from 'rxjs/operators';
import {forkJoin, of} from 'rxjs';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertDialogComponent } from '../../../../shared/components/alert-dialog/alert-dialog.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    LoadingSpinnerComponent,
    AlertDialogComponent
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  // User data
  user: UserResponse | null = null;

  // Purchased courses data
  purchasedCourses: CourseResponse[] = [];

  // Certificates data
  userCertificates: CertificateResponse[] = [];

  // Loading states
  isLoading: boolean = true;
  isLoadingCourses: boolean = false;
  isLoadingCertificates: boolean = false;

  // Messages
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
      private userService: UserService,
      private courseService: CourseService,
      private certificateService: CertificateService,
      private tokenService: TokenService,
      private router: Router,
      private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.loadUserProfile();
  }

  /**
   * Kullanıcı profil bilgilerini backend'den yükler ve sonrasında kurslar + sertifikaları yükler.
   */
  loadUserProfile(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    const userId = this.tokenService.getStoredUser()?.id;

    if (!userId) {
      this.errorMessage = this.translate.instant('USER_ID_NOT_FOUND');
      this.isLoading = false;
      this.tokenService.signOut();
      this.router.navigate(['/auth/login']);
      return;
    }

    this.userService.getUserById(userId).pipe(
        catchError(error => {
          this.errorMessage = error.message || this.translate.instant('PROFILE_LOAD_FAILED');
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
        })
    ).subscribe(user => {
      if (user) {
        this.user = user;
        // Kullanıcı yüklendikten sonra kurslar ve sertifikaları yükle
        this.loadUserCoursesAndCertificates(userId);
      }
    });
  }

  /**
   * Kullanıcının satın aldığı kurslar ve sertifikalarını yükler
   */
  private loadUserCoursesAndCertificates(userId: number): void {
    this.isLoadingCourses = true;
    this.isLoadingCertificates = true;

    // Purchased courses ve certificates'ı paralel yükle
    forkJoin({
      courses: this.courseService.getPurchasedCoursesByUserId(userId).pipe(
          catchError(error => {
            console.error('Error loading purchased courses:', error);
            return of([]);
          })
      ),
      certificates: this.certificateService.getCertificatesByUserId(userId).pipe(
          catchError(error => {
            console.error('Error loading certificates:', error);
            return of([]);
          })
      )
    }).pipe(
        finalize(() => {
          this.isLoadingCourses = false;
          this.isLoadingCertificates = false;
        })
    ).subscribe(({ courses, certificates }) => {
      this.purchasedCourses = courses || [];
      this.userCertificates = certificates || [];
    });
  }

  /**
   * Kullanıcının rolünü Türkçe/Ukraynaca olarak çevirir.
   * @param roleKey Rol anahtarı (örn. 'ROLE_USER').
   * @returns Çevrilmiş rol adı.
   */
  getTranslatedRole(roleKey: string): string {
    switch (roleKey) {
      case 'ROLE_USER': return this.translate.instant('ROLE_LEARNER');
      case 'INSTRUCTOR': return this.translate.instant('INSTRUCTOR');
      case 'ROLE_ADMIN': return this.translate.instant('ROLE_ADMIN');
      default: return roleKey;
    }
  }

  /**
   * Kurs fiyatını formatlar
   */
  formatPrice(price: number): string {
    if (price === 0) {
      return this.translate.instant('FREE');
    }

    try {
      const lang = this.translate.currentLang || 'en';
      const currency = lang === 'tr' ? 'TRY' : lang === 'uk' ? 'UAH' : 'USD';
      const locale = lang === 'tr' ? 'tr-TR' : lang === 'uk' ? 'uk-UA' : 'en-US';

      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(price);
    } catch (error) {
      return `$${price.toFixed(2)}`;
    }
  }

  /**
   * Süreyi formatlar (dakika cinsinden)
   */
  formatDuration(minutes: number): string {
    if (minutes <= 0) {
      return this.translate.instant('DURATION_NOT_SPECIFIED');
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0 && mins > 0) {
      return this.translate.instant('DURATION_HOURS_MINUTES', { hours, minutes: mins });
    } else if (hours > 0) {
      return this.translate.instant('DURATION_HOURS', { hours });
    } else {
      return this.translate.instant('DURATION_MINUTES', { minutes: mins });
    }
  }

  /**
   * Kurs kategorisini çevirir
   */
  getCategoryTranslation(category: string): string {
    return this.translate.instant(`CATEGORY.${category}`);
  }

  /**
   * Displayed courses (ilk 6 kurs)
   */
  getDisplayedCourses(): CourseResponse[] {
    return this.purchasedCourses.slice(0, 6);
  }

  /**
   * Displayed certificates (ilk 4 sertifika)
   */
  getDisplayedCertificates(): CertificateResponse[] {
    return this.userCertificates.slice(0, 4);
  }

  /**
   * Kalan kurs sayısı
   */
  getRemainingCoursesCount(): number {
    return Math.max(0, this.purchasedCourses.length - 6);
  }

  /**
   * Kalan sertifika sayısı
   */
  getRemainingCertificatesCount(): number {
    return Math.max(0, this.userCertificates.length - 4);
  }

  /**
   * Kursa git
   */
  navigateToCourse(courseId: number): void {
    this.router.navigate(['/courses', courseId]);
  }

  /**
   * Sertifikaya git
   */
  navigateToCertificate(certificateId: number): void {
    this.router.navigate(['/certificates', certificateId]);
  }

  /**
   * Tüm kursları görüntüle
   */
  viewAllCourses(): void {
    this.router.navigate(['/user/purchased-courses']);
  }

  /**
   * Tüm sertifikaları görüntüle
   */
  viewAllCertificates(): void {
    this.router.navigate(['/certificates']);
  }

  /**
   * Alert dialog kapatıldığında mesajları temizler.
   */
  clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
  }

  /**
   * Track by functions for ngFor performance
   */
  trackByCourseId(index: number, course: CourseResponse): number {
    return course.id;
  }

  trackByCertificateId(index: number, certificate: CertificateResponse): number {
    return certificate.id;
  }
}