// course-detail.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CourseService } from '../../services/course.service';
import { CourseDetailsResponse, LessonDTO, CourseCategory, CourseLevel } from '../../models/course.models';
import { ReviewService } from '../../../reviews/services/review.service';
import { ReviewResponse } from '../../../reviews/models/review.models';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertDialogComponent } from '../../../../shared/components/alert-dialog/alert-dialog.component';
import { TokenService } from '../../../../core/services/token.service';
import { PaymentService } from '../../../payment/payment.service';
import { PaymentResponse } from '../../../payment/models/payment.models';

// LiqPayCheckout objesinin global olarak var olduğunu belirtmek için
declare const LiqPayCheckout: any;

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
  isLoggedIn: boolean = false;
  hasPurchasedCourse: boolean = false;

  constructor(
      private route: ActivatedRoute,
      private courseService: CourseService,
      private translate: TranslateService,
      private tokenService: TokenService,
      private router: Router,
      private reviewService: ReviewService,
      private paymentService: PaymentService
  ) { }

  ngOnInit(): void {
    this.currentUserId = this.tokenService.getUser()?.id || null;
    this.isLoggedIn = !!this.currentUserId;

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

  loadCourseDetails(id: number): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;
    this.hasPurchasedCourse = false;

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
        if (this.course.reviews && this.currentUserId) {
          this.hasUserReviewed = this.course.reviews.some(review => review.userId === this.currentUserId);
          this.course.reviews = this.course.reviews.map(review => ({
            ...review,
            isCurrentUserReview: review.userId === this.currentUserId
          }));
        }
        // Satın alma durumunu kontrol eden placeholder.
        // Gerçek uygulamada bu kontrolü yapan bir servis çağrısı yapılmalıdır.
        this.checkIfUserHasPurchasedCourse(id);
      }
    });
  }

  // Kullanıcının kursu satın alıp almadığını kontrol eden yardımcı metot
  // NOT: Bu metot, backend'de bu kontrolü yapan bir servis metodu yazıldığında güncellenmelidir.
  checkIfUserHasPurchasedCourse(courseId: number): void {
    // Örneğin, bu kontrolü yapan bir servis metodu yazmalısınız:
    // this.courseService.isCoursePurchasedByUser(courseId, this.currentUserId).subscribe(
    //   isPurchased => this.hasPurchasedCourse = isPurchased
    // );
    this.hasPurchasedCourse = false;
  }

  // Ödeme işlemini başlatan metod
  purchaseCourse(): void {
    if (!this.courseId || !this.course) {
      this.errorMessage = this.translate.instant('ERROR_NO_COURSE_SELECTED');
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    this.paymentService.initiatePayment(this.courseId).subscribe(
        (response: PaymentResponse) => {
          this.isLoading = false;
          LiqPayCheckout.init({
            data: response.data,
            signature: response.signature,
            embedTo: "#liqpay_checkout",
            mode: "embed"
          }).on("liqpay.callback", (data: any) => {
            console.log("Ödeme durumu:", data.status);
            if (data.status === 'success') {
              this.successMessage = this.translate.instant('PAYMENT_SUCCESSFUL');
              this.loadCourseDetails(this.courseId!);
            } else {
              this.errorMessage = this.translate.instant('PAYMENT_FAILED_WITH_STATUS', { status: data.status });
            }
          }).on("liqpay.close", () => {
            this.loadCourseDetails(this.courseId!);
          });
        },
        (error) => {
          this.isLoading = false;
          this.errorMessage = error.message || this.translate.instant('PAYMENT_INITIATE_FAILED');
          console.error('Ödeme başlatılırken hata oluştu:', error);
        }
    );
  }

  getUsersReviewId(): number | null {
    if (this.course && this.course.reviews && this.currentUserId) {
      const userReview = this.course.reviews.find(review => review.userId === this.currentUserId);
      return userReview ? userReview.id : null;
    }
    return null;
  }

  clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
  }

  getLessonVideoUrl(lesson: LessonDTO): string {
    return lesson.videoUrl;
  }

  getAverageRating(): number {
    if (!this.course || !this.course.reviews || this.course.reviews.length === 0) {
      return 0;
    }
    const totalRating = this.course.reviews.reduce((sum, review) => sum + review.rating, 0);
    return totalRating / this.course.reviews.length;
  }

  deleteCourse(courseId: number): void {
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

  canModifyReview(review: ReviewResponse): boolean {
    return review.isCurrentUserReview || this.isInstructorOrAdmin;
  }

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