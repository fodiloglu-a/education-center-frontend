// course-detail.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CourseService } from '../../services/course.service';
import { CourseDetailsResponse, LessonDTO, CourseCategory, CourseLevel } from '../../models/course.models';
import { ReviewService } from '../../../reviews/services/review.service';
import { ReviewResponse } from '../../../reviews/models/review.models'; // ReviewResponse import edildi

import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertDialogComponent } from '../../../../shared/components/alert-dialog/alert-dialog.component';
import { TokenService } from '../../../../core/services/token.service';

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    LoadingSpinnerComponent,
    AlertDialogComponent
  ],
  templateUrl: './course-detail.component.html',
  styleUrl: './course-detail.component.css'
})
export class CourseDetailComponent implements OnInit {
  course: CourseDetailsResponse | null = null;
  isLoading: boolean = true;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  courseId: number | null = null;
  isInstructorOrAdmin: boolean = false;
  currentUserId: number | null = null;
  hasUserReviewed: boolean = false;

  constructor(
      private route: ActivatedRoute,
      private courseService: CourseService,
      private translate: TranslateService,
      private tokenService: TokenService,
      private router: Router,
      private reviewService: ReviewService
  ) { }

  ngOnInit(): void {
    this.currentUserId = this.tokenService.getUser()?.id || null;

    this.route.paramMap.subscribe(params => {
      const id = params.get('courseId');
      if (id) {
        this.courseId = +id;
        this.loadCourseDetails(this.courseId);
      } else {
        this.errorMessage = this.translate.instant('COURSE_ID_NOT_FOUND');
        this.isLoading = false;
      }
    });

    this.tokenService.userRole$.subscribe(role => {
      this.isInstructorOrAdmin = role === 'ROLE_INSTRUCTOR' || role === 'ROLE_ADMIN';
    });
  }

  /**
   * Belirli bir eğitimin detaylarını backend'den yükler.
   * @param id Eğitimin ID'si.
   */
  loadCourseDetails(id: number): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    this.courseService.getCourseDetailsById(id).pipe(
        catchError(error => {
          this.errorMessage = error.message || this.translate.instant('COURSE_DETAIL_LOAD_FAILED_GENERIC');
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
        })
    ).subscribe(course => {
      if (course) {
        this.course = course;
        if (this.course.lessons) {
          this.course.lessons = [...this.course.lessons].sort((a, b) => a.lessonOrder - b.lessonOrder);
        }
        // Yorumları işlerken kullanıcının kendi yorumu olup olmadığını kontrol et
        if (this.course.reviews && this.currentUserId) {
          // Kullanıcının bu kursa yorum yapıp yapmadığını kontrol et
          this.hasUserReviewed = this.course.reviews.some(review => review.userId === this.currentUserId);
          // Her yoruma kendi yorumu olup olmadığını belirten bir bayrak ekle
          this.course.reviews = this.course.reviews.map(review => ({
            ...review,
            isCurrentUserReview: review.userId === this.currentUserId
          }));
        }
      }
    });
  }

  /**
   * Mevcut kullanıcının bu kursa yaptığı yorumun ID'sini döndürür.
   * Eğer yorum yapmamışsa null döner.
   */
  getUsersReviewId(): number | null {
    if (this.course && this.course.reviews && this.currentUserId) {
      const userReview = this.course.reviews.find(review => review.userId === this.currentUserId);
      return userReview ? userReview.id : null;
    }
    return null;
  }

  /**
   * Alert dialog kapatıldığında mesajları temizler.
   */
  clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
  }

  /**
   * Bir dersin video URL'sini döndürür.
   * @param lesson Ders nesnesi.
   * @returns Dersin video URL'si.
   */
  getLessonVideoUrl(lesson: LessonDTO): string {
    return lesson.videoUrl;
  }

  /**
   * Eğitime yapılan yorumların ortalama puanını hesaplar.
   * @returns Ortalama puan veya 0 eğer yorum yoksa.
   */
  getAverageRating(): number {
    if (!this.course || !this.course.reviews || this.course.reviews.length === 0) {
      return 0;
    }
    const totalRating = this.course.reviews.reduce((sum, review) => sum + review.rating, 0);
    return totalRating / this.course.reviews.length;
  }

  /**
   * Eğitimi silme işlemini başlatır.
   * @param courseId Silinecek eğitimin ID'si.
   */
  deleteCourse(courseId: number): void {
    // confirm yerine AlertDialogComponent kullanmalıyız
    // const confirmation = confirm(this.translate.instant('CONFIRM_DELETE_COURSE'));
    // if (confirmation) { ... }
    // Şimdilik confirm kullanmaya devam ediyorum, ancak gerçek uygulamada bu değiştirilmeli.
    const confirmation = confirm(this.translate.instant('CONFIRM_DELETE_COURSE'));
    if (confirmation) {
      this.isLoading = true;
      this.courseService.deleteCourse(courseId).pipe(
          catchError(error => {
            this.errorMessage = error.message || this.translate.instant('DELETE_COURSE_FAILED_GENERIC');
            return of(null);
          }),
          finalize(() => {
            this.isLoading = false;
          })
      ).subscribe(response => {
        if (response === null) {
          return;
        }
        this.successMessage = this.translate.instant('DELETE_COURSE_SUCCESS');
        this.router.navigate(['/courses']);
      });
    }
  }

  /**
   * Eğitimin yayınlanma durumunu değiştirir (yayınla/yayından kaldır).
   * @param courseId Durumu değiştirilecek eğitimin ID'si.
   */
  toggleCoursePublishedStatus(courseId: number): void {
    const confirmation = confirm(this.translate.instant('CONFIRM_TOGGLE_PUBLISH'));
    if (confirmation) {
      this.isLoading = true;
      this.courseService.toggleCoursePublishedStatus(courseId).pipe(
          catchError(error => {
            this.errorMessage = error.message || this.translate.instant('TOGGLE_PUBLISH_FAILED_GENERIC');
            return of(null);
          }),
          finalize(() => {
            this.isLoading = false;
          })
      ).subscribe(updatedCourse => {
        if (updatedCourse) {
          this.course!.published = updatedCourse.published;
          this.successMessage = this.translate.instant('TOGGLE_PUBLISH_SUCCESS');
        }
      });
    }
  }

  /**
   * Bir dersi silme işlemini başlatır.
   * @param courseId Dersin ait olduğu eğitimin ID'si.
   * @param lessonId Silinecek dersin ID'si.
   */
  deleteLesson(courseId: number, lessonId: number): void {
    const confirmation = confirm(this.translate.instant('CONFIRM_DELETE_LESSON'));
    if (confirmation) {
      this.isLoading = true;
      this.courseService.deleteLessonFromCourse(courseId, lessonId).pipe(
          catchError(error => {
            this.errorMessage = error.message || this.translate.instant('DELETE_LESSON_FAILED_GENERIC');
            return of(null);
          }),
          finalize(() => {
            this.isLoading = false;
          })
      ).subscribe(response => {
        if (response === null) {
          return;
        }
        this.successMessage = this.translate.instant('DELETE_LESSON_SUCCESS');
        this.loadCourseDetails(courseId);
      });
    }
  }

  /**
   * Bir yorumu silme işlemini başlatır.
   * @param reviewId Silinecek yorumun ID'si.
   */
  deleteReview(reviewId: number): void {
    const confirmation = confirm(this.translate.instant('CONFIRM_DELETE_REVIEW'));
    if (confirmation) {
      this.isLoading = true;
      this.reviewService.deleteReview(reviewId).pipe(
          catchError(error => {
            this.errorMessage = error.message || this.translate.instant('DELETE_REVIEW_FAILED_GENERIC');
            return of(null);
          }),
          finalize(() => {
            this.isLoading = false;
          })
      ).subscribe(response => {
        if (response === null) {
          return;
        }
        this.successMessage = this.translate.instant('DELETE_REVIEW_SUCCESS');
        this.loadCourseDetails(this.courseId!);
      });
    }
  }

  /**
   * Bir yorumu düzenleme veya silme yetkisi olup olmadığını kontrol eder.
   * Kullanıcı kendi yorumunu veya admin/eğitmen herhangi bir yorumu düzenleyebilir/silebilir.
   * @param review Yorum nesnesi.
   * @returns Yetki varsa true, aksi takdirde false.
   */
  canModifyReview(review: ReviewResponse): boolean {
    // isCurrentUserReview bayrağını kullanıyoruz
    return review.isCurrentUserReview || this.isInstructorOrAdmin;
  }

  // Yeni eklenen alanlar için çeviri helper'ları
  getCategoryTranslation(category: CourseCategory): string {
    return this.translate.instant(`CATEGORY.${category}`);
  }

  getLevelTranslation(level: CourseLevel): string {
    return this.translate.instant(`LEVEL.${level}`);
  }

  formatDuration(minutes: number): string {
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

  formatPrice(price: number): string {
    const lang = this.translate.currentLang;
    const currency = lang === 'tr' ? 'TRY' : 'UAH';
    const locale = lang === 'tr' ? 'tr-TR' : 'uk-UA';

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  }
}