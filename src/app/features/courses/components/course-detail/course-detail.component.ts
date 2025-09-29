// course-detail.component.ts

import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  Inject,
  PLATFORM_ID,
  ChangeDetectionStrategy
} from '@angular/core';
import {CommonModule, isPlatformBrowser, NgOptimizedImage} from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError, finalize, switchMap, tap } from 'rxjs/operators';
import { CourseService } from '../../services/course.service';
import { ReviewService } from '../../../reviews/services/review.service';
import { AuthService } from '../../../../core/services/auth.service';
import { PaymentService } from '../../../payment/services/payment.service';
import { CourseResponse, CourseDetailsResponse, CourseCategory, CourseLevel, LessonDTO } from '../../models/course.models';
import { ReviewResponse, ReviewRequest } from '../../../reviews/models/review.models';
import { UserProfile } from '../../../auth/models/auth.models';
import { PaymentResponse, isValidPaymentResponse, LiqPayStatus } from '../../../payment/models/payment.models';
import {AlertDialogComponent} from "../../../../shared/components/alert-dialog/alert-dialog.component";
import {LoadingSpinnerComponent} from "../../../../shared/components/loading-spinner/loading-spinner.component";
import {TokenService} from "../../../../core/services/token.service";
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {environment} from "../../../../../environments/environment";

// LiqPayCheckout global declaration
declare const LiqPayCheckout: any;

interface ComponentState {
  isLoading: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  isLoggedIn: boolean;
  currentUser: UserProfile | null;
  hasPurchasedCourse: boolean;
  isInstructorOrAdmin: boolean;
  showReviewForm: boolean;
  isSubmittingReview: boolean;
  isCourseOwner: boolean;
  showLiqpayContainer: boolean;
  isProcessingPayment: boolean;
}

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    ReactiveFormsModule,
    LoadingSpinnerComponent,
    AlertDialogComponent,
    NgOptimizedImage
  ],
  templateUrl: './course-detail.component.html',
  styleUrl: './course-detail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseDetailComponent implements OnInit, OnDestroy {

  // Data properties
  course: CourseResponse | CourseDetailsResponse | null = null;
  courseReviews: ReviewResponse[] = [];
  userReview: ReviewResponse | null = null;
  courseId: number | null = null;

  // Form
  reviewForm!: FormGroup;

  // State management
  private currentState: ComponentState = {
    isLoading: true,
    errorMessage: null,
    successMessage: null,
    isLoggedIn: false,
    currentUser: null,
    hasPurchasedCourse: false,
    isInstructorOrAdmin: false,
    showReviewForm: false,
    isSubmittingReview: false,
    isCourseOwner: false,
    showLiqpayContainer: false,
    isProcessingPayment: false,
  };

  // Lifecycle
  private destroy$ = new Subject<void>();

  // Public getters
  courseImageUrl: string|null = null;
  get isLoading(): boolean { return this.currentState.isLoading; }
  get errorMessage(): string | null { return this.currentState.errorMessage; }
  get successMessage(): string | null { return this.currentState.successMessage; }
  get isLoggedIn(): boolean { return this.currentState.isLoggedIn; }
  get currentUser(): UserProfile | null { return this.currentState.currentUser; }
  get hasPurchasedCourse(): boolean { return this.currentState.hasPurchasedCourse; }
  get isInstructorOrAdmin(): boolean { return this.currentState.isInstructorOrAdmin; }
  get showReviewForm(): boolean { return this.currentState.showReviewForm; }
  get isSubmittingReview(): boolean { return this.currentState.isSubmittingReview; }
  get isCourseOwner(): boolean { return this.currentState.isCourseOwner; }
  get showLiqpayContainer(): boolean { return this.currentState.showLiqpayContainer; }
  get isProcessingPayment(): boolean { return this.currentState.isProcessingPayment; }

  constructor(
      private route: ActivatedRoute,
      private router: Router,
      private courseService: CourseService,
      private reviewService: ReviewService,
      private authService: AuthService,
      private paymentService: PaymentService,
      private translate: TranslateService,
      private cdr: ChangeDetectorRef,
      private tokenService: TokenService,
      private http: HttpClient,
      @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.initializeReviewForm();
  }

  ngOnInit(): void {
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ========== INITIALIZATION ==========

  private initializeComponent(): void {
    this.updateState({ isLoading: true });

    // Setup authentication listener
    this.authService.getCurrentUser()
        .pipe(
            takeUntil(this.destroy$),
            tap(user => {
              this.updateState({
                isLoggedIn: !!user,
                currentUser: user,
              });
            }),
            switchMap(() => this.route.paramMap)
        )
        .subscribe(params => {
          const id = params.get('courseId');
          if (id) {
            this.courseId = +id;
            this.loadCourseData();
          } else {
            this.updateState({
              errorMessage: this.translate.instant('COURSE_ID_NOT_FOUND'),
              isLoading: false
            });
          }
        });
  }

  private initializeReviewForm(): void {
    this.reviewForm = new FormGroup({
      rating: new FormControl(5, [Validators.required, Validators.min(1), Validators.max(5)]),
      comment: new FormControl('', [Validators.maxLength(500)])
    });
  }

  // ========== DATA LOADING ==========

  private loadCourseData(): void {
    if (!this.courseId) return;

    this.updateState({ isLoading: true, errorMessage: null });

    // Check user permissions
    const checkAccess$ = this.isLoggedIn
        ? this.courseService.checkCourseAccess(this.currentUser?.id||0,this.courseId)
        : of(false);

    const checkOwnership$ = this.isLoggedIn
        ? this.courseService.checkCourseForInstructor(this.currentUser?.id || 0, this.courseId)
        : of(false);

    forkJoin({
      hasPurchased: checkAccess$,
      isCourseOwner: checkOwnership$
    })
        .pipe(
            takeUntil(this.destroy$),
            switchMap(({ hasPurchased, isCourseOwner }) => {
              this.updateState({
                hasPurchasedCourse: hasPurchased,
                isCourseOwner: isCourseOwner,
                isInstructorOrAdmin: isCourseOwner || this.hasAdminRole()
              });

              // Load appropriate course data based on purchase status or ownership
              const courseData$ = (hasPurchased || isCourseOwner)
                  ? this.courseService.getCourseDetailsById(this.courseId!)
                  : this.courseService.getCourseResponseById(this.courseId!);

              // Load reviews
              const reviews$ = this.reviewService.getReviewsByCourseId(this.courseId!);

              return forkJoin({
                course: courseData$,
                reviews: reviews$
              });
            }),

            catchError(error => {
              console.error('Error loading course data:', error);
              this.updateState({
                errorMessage: this.translate.instant('COURSE_LOAD_ERROR'),
                isLoading: false
              });
              return of(null);
            }),
            finalize(() => {
              this.updateState({ isLoading: false });
              this.cdr.markForCheck();
            })
        )
        .subscribe(data => {
          if (data) {

            this.courseImageUrl=data.course.imageUrl;
            console.log(this.courseImageUrl);
            this.course = data.course;
            this.courseReviews = data.reviews || [];
            this.processUserReview();
            this.cdr.markForCheck();
          }
        });

  }

  private processUserReview(): void {
    if (this.isLoggedIn && this.currentUser && this.courseReviews.length > 0) {
      this.userReview = this.courseReviews.find(
          review => review.userId === this.currentUser!.id
      ) || null;
    }
  }

  private hasAdminRole(): boolean {
    return this.currentUser?.role?.includes('ADMIN') || false;
  }

  // ========== COURSE ACTIONS ==========

  purchaseCourse(): void {
    console.log('Purchase button clicked, courseId:', this.courseId); // BU SATIRI EKLEYİN

    if (!this.courseId || !this.course || !this.isLoggedIn) {
      this.updateState({
        errorMessage: this.translate.instant('PURCHASE_ERROR_REQUIREMENTS')
      });
      return;
    }

    // Daha önce satın alınmış mı kontrol et
    if (this.hasPurchasedCourse) {
      this.updateState({
        errorMessage: this.translate.instant('COURSE_ALREADY_PURCHASED')
      });
      return;
    }

    // Kurs sahibi kontrolü
    if (this.isCourseOwner) {
      this.updateState({
        errorMessage: this.translate.instant('CANNOT_PURCHASE_OWN_COURSE')
      });
      return;
    }

    // YENİ: Checkout sayfasına yönlendir
    console.log('Navigating to checkout:', this.courseId);
    this.router.navigate(['payment/checkout', this.courseId]);
  }

  private initializeLiqPay(response: PaymentResponse): void {
    // Browser kontrolü
    if (!isPlatformBrowser(this.platformId)) {
      console.warn('LiqPay can only be initialized in browser environment');
      return;
    }

    // LiqPayCheckout global objesinin varlığını kontrol et
    if (typeof LiqPayCheckout === 'undefined') {
      console.error('LiqPayCheckout is not loaded');
      this.updateState({
        errorMessage: this.translate.instant('LIQPAY_NOT_LOADED'),
        showLiqpayContainer: false
      });
      return;
    }

    // Container element'in varlığını kontrol et
    const container = document.getElementById('liqpay_checkout');
    if (!container) {
      console.error('LiqPay container not found');
      this.updateState({
        errorMessage: this.translate.instant('LIQPAY_CONTAINER_NOT_FOUND'),
        showLiqpayContainer: false
      });
      return;
    }

    // Container'ı temizle
    container.innerHTML = '';

    try {
      console.log('Initializing LiqPay with data:', {
        hasData: !!response.data,
        hasSignature: !!response.signature,
        dataLength: response.data?.length || 0
      });

      const checkout = LiqPayCheckout.init({
        data: response.data,
        signature: response.signature,
        embedTo: "#liqpay_checkout",
        mode: "embed"
      });

      // Event handler'ları ekle
      checkout.on("liqpay.callback", (data: any) => {
        console.log('LiqPay callback received:', data);
        this.handlePaymentCallback(data);
      });

      checkout.on("liqpay.ready", () => {
        console.log('LiqPay form is ready');
        this.cdr.markForCheck();
      });

      checkout.on("liqpay.close", () => {
        console.log('LiqPay form closed');
        this.updateState({ showLiqpayContainer: false });
        // Kurs verilerini yenile (ödeme başarılı olmuş olabilir)
        this.loadCourseData();
      });

      checkout.on("liqpay.error", (error: any) => {
        console.error('LiqPay error:', error);
        this.updateState({
          errorMessage: this.translate.instant('LIQPAY_ERROR'),
          showLiqpayContainer: false
        });
      });

    } catch (error) {
      console.error('LiqPay initialization error:', error);
      this.updateState({
        errorMessage: this.translate.instant('PAYMENT_INIT_ERROR'),
        showLiqpayContainer: false
      });
    }
  }

  private handlePaymentCallback(data: any): void {
    console.log('Processing payment callback:', data);

    if (!data) {
      this.updateState({
        errorMessage: this.translate.instant('INVALID_PAYMENT_CALLBACK')
      });
      return;
    }

    // İlk olarak client callback'i backend'e gönder
    this.sendClientCallback(data);

    // Ödeme durumunu kontrol et
    if (data.status === LiqPayStatus.SUCCESS || data.status === LiqPayStatus.SANDBOX) {
      this.updateState({
        successMessage: this.translate.instant('PAYMENT_SUCCESSFUL'),
        showLiqpayContainer: false
      });

      // Kurs verilerini yenile
      setTimeout(() => {
        this.loadCourseData();
      }, 1000);

    } else if (data.status === LiqPayStatus.FAILURE || data.status === LiqPayStatus.ERROR) {
      this.updateState({
        errorMessage: this.translate.instant('PAYMENT_FAILED_WITH_STATUS', { status: data.status }),
        showLiqpayContainer: false
      });
    } else {
      // Diğer durumlar (processing, wait_secure vb.)
      this.updateState({
        successMessage: this.translate.instant('PAYMENT_PROCESSING', { status: data.status }),
        showLiqpayContainer: false
      });

      // Biraz bekleyip kurs verilerini yenile
      setTimeout(() => {
        this.loadCourseData();
      }, 3000);
    }
  }


  // YENİ METHOD: Client callback'i backend'e gönder
  private sendClientCallback(callbackData: any): void {
    const token = this.tokenService.getAccessToken();

    if (!token) {
      console.warn('No token available for client callback');
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.post(`${environment.apiUrl}/payment/client-callback`, callbackData, { headers })
        .pipe(
            takeUntil(this.destroy$),
            catchError(error => {
              console.error('Client callback error:', error);
              return of(null);
            })
        )
        .subscribe(response => {
          if (response) {
            console.log('Client callback response:', response);
          }
        });
  }
  // Ödeme container'ını manuel olarak kapatma methodu
  closeLiqPayContainer(): void {
    this.updateState({ showLiqpayContainer: false });
    this.cdr.markForCheck();
  }

  // ========== REVIEW ACTIONS ==========

  toggleReviewForm(): void {
    this.updateState({ showReviewForm: !this.showReviewForm });

    if (this.showReviewForm && this.userReview) {
      // Populate form with existing review
      this.reviewForm.patchValue({
        rating: this.userReview.rating,
        comment: this.userReview.comment
      });
    } else if (this.showReviewForm) {
      // Reset form for new review
      this.reviewForm.reset({ rating: 5, comment: '' });
    }
  }

  submitReview(): void {
    if (this.reviewForm.invalid || !this.courseId || !this.isLoggedIn) {
      this.reviewForm.markAllAsTouched();
      return;
    }

    if (!this.hasPurchasedCourse && !this.isInstructorOrAdmin) {
      this.updateState({
        errorMessage: this.translate.instant('PURCHASE_REQUIRED_TO_REVIEW')
      });
      return;
    }

    this.updateState({ isSubmittingReview: true, errorMessage: null });

    const reviewData: ReviewRequest = {
      courseId: this.courseId,
      rating: this.reviewForm.get('rating')?.value,
      comment: this.reviewForm.get('comment')?.value || ''
    };

    const operation$ = this.userReview
        ? this.reviewService.updateReview(this.userReview.id, reviewData)
        : this.reviewService.addReview(reviewData);

    operation$
        .pipe(
            takeUntil(this.destroy$),
            finalize(() => {
              this.updateState({ isSubmittingReview: false });
              this.cdr.markForCheck();
            })
        )
        .subscribe({
          next: () => {
            this.updateState({
              successMessage: this.translate.instant(
                  this.userReview ? 'REVIEW_UPDATED_SUCCESS' : 'REVIEW_ADDED_SUCCESS'
              ),
              showReviewForm: false
            });
            this.loadCourseData();
          },
          error: (error) => {
            this.updateState({
              errorMessage: error.message || this.translate.instant('REVIEW_SAVE_ERROR')
            });
          }
        });
  }

  deleteReview(reviewId: number): void {
    if (!confirm(this.translate.instant('CONFIRM_DELETE_REVIEW'))) {
      return;
    }

    this.updateState({ isLoading: true, errorMessage: null });

    this.reviewService.deleteReview(reviewId)
        .pipe(
            takeUntil(this.destroy$),
            finalize(() => {
              this.updateState({ isLoading: false });
              this.cdr.markForCheck();
            })
        )
        .subscribe({
          next: () => {
            this.updateState({
              successMessage: this.translate.instant('REVIEW_DELETED_SUCCESS')
            });
            this.loadCourseData();
          },
          error: (error) => {
            this.updateState({
              errorMessage: error.message || this.translate.instant('REVIEW_DELETE_ERROR')
            });
          }
        });
  }

  // ========== ADMIN ACTIONS ==========

  deleteCourse(): void {
    if (!this.courseId || !confirm(this.translate.instant('CONFIRM_DELETE_COURSE'))) {
      return;
    }

    this.updateState({ isLoading: true });

    this.courseService.deleteCourse(this.courseId)
        .pipe(
            takeUntil(this.destroy$),
            finalize(() => {
              this.updateState({ isLoading: false });
              this.cdr.markForCheck();
            })
        )
        .subscribe({
          next: () => {
            this.updateState({
              successMessage: this.translate.instant('COURSE_DELETED_SUCCESS')
            });
            this.router.navigate(['/courses']);
          },
          error: (error) => {
            this.updateState({
              errorMessage: error.message || this.translate.instant('COURSE_DELETE_ERROR')
            });
          }
        });
  }

  togglePublishStatus(): void {
    if (!this.courseId || !this.course || !confirm(this.translate.instant('CONFIRM_TOGGLE_PUBLISH'))) {
      return;
    }

    this.updateState({ isLoading: true });

    this.courseService.toggleCoursePublishedStatus(this.courseId)
        .pipe(
            takeUntil(this.destroy$),
            finalize(() => {
              this.updateState({ isLoading: false });
              this.cdr.markForCheck();
            })
        )
        .subscribe({
          next: (updatedCourse) => {
            if (this.course) {
              this.course.published = updatedCourse.published;
            }
            this.updateState({
              successMessage: this.translate.instant('PUBLISH_STATUS_UPDATED')
            });
          },
          error: (error) => {
            this.updateState({
              errorMessage: error.message || this.translate.instant('PUBLISH_STATUS_ERROR')
            });
          }
        });
  }

  // ========== LESSON ACTIONS ==========

  editLesson(lessonId: number): void {
    if (!this.canEditCourse()) {
      this.updateState({
        errorMessage: this.translate.instant('UNAUTHORIZED_ACTION')
      });
      return;
    }
    this.navigateToLessonEdit(lessonId);
  }

  deleteLesson(lessonId: number): void {
    if (!this.canEditCourse()) {
      this.updateState({
        errorMessage: this.translate.instant('UNAUTHORIZED_ACTION')
      });
      return;
    }

    if (!this.courseId || !confirm(this.translate.instant('CONFIRM_DELETE_LESSON'))) {
      return;
    }

    this.updateState({ isLoading: true });

    this.courseService.deleteLessonFromCourse(this.courseId, lessonId)
        .pipe(
            takeUntil(this.destroy$),
            finalize(() => {
              this.updateState({ isLoading: false });
              this.cdr.markForCheck();
            })
        )
        .subscribe({
          next: () => {
            this.updateState({
              successMessage: this.translate.instant('LESSON_DELETED_SUCCESS')
            });
            this.loadCourseData();
          },
          error: (error) => {
            this.updateState({
              errorMessage: error.message || this.translate.instant('LESSON_DELETE_ERROR')
            });
          }
        });
  }

  // ========== AUTHORIZATION HELPERS ==========

  /**
   * Kurs sahibi mi kontrolü yapar
   */
  canEditCourse(): boolean {
    return this.isCourseOwner || this.hasAdminRole();
  }

  /**
   * Dersleri görüntüleyebilir mi kontrolü
   */
  canAccessLessons(): boolean {
    return this.hasPurchasedCourse || this.isCourseOwner || this.hasAdminRole();
  }

  /**
   * Belirli bir derse erişim kontrolü
   */
  canAccessLesson(lesson: LessonDTO): boolean {
    // Preview lessons are accessible to EVERYONE (logged in or not)
    if (lesson.preview) {
      return true;
    }

    // Non-preview lessons: only purchased users, course owners, and admins
    return this.hasPurchasedCourse || this.isCourseOwner || this.hasAdminRole();
  }

  /**
   * Yorum yapabilir mi kontrolü - Sadece satın alan kullanıcılar (kurs sahibi değil)
   */
  canReview(): boolean {
    // Kurs sahibi kendi kursuna yorum yapmamalı
    if (this.isCourseOwner) {
      return false;
    }

    // Sadece giriş yapmış ve satın almış kullanıcılar yorum yapabilir
    return this.isLoggedIn && this.hasPurchasedCourse;
  }

  /**
   * Yorumu düzenleyebilir mi kontrolü
   */
  canModifyReview(review: ReviewResponse): boolean {
    // Kendi yorumunu düzenleyebilir veya admin/kurs sahibi silebilir
    return (this.isLoggedIn && this.currentUser?.id === review.userId) ||
        this.isCourseOwner || this.hasAdminRole();
  }

  /**
   * Satın alma butonunu göster mi kontrolü
   */
  shouldShowPurchaseButton(): boolean {
    return this.isLoggedIn &&
        !this.hasPurchasedCourse &&
        !this.isCourseOwner &&
        !this.hasAdminRole() &&
        this.course!.price > 0;
  }

  /**
   * Ücretsiz kayıt butonunu göster mi kontrolü
   */
  shouldShowEnrollButton(): boolean {
    return this.isLoggedIn &&
        !this.hasPurchasedCourse &&
        !this.isCourseOwner &&
        !this.hasAdminRole() &&
        this.course!.price === 0;
  }

  // ========== UTILITY METHODS ==========

  getCategoryTranslation(category: CourseCategory): string {
    if (!category) return '';

    // Normalizasyon: "Web Development" -> "WEB_DEVELOPMENT"
    const normalized = category
        .toString()
        .trim()
        .replace(/[-\s]+/g, '_')  // boşluk & tireleri altçizgi yap
        .replace(/[^\w]/g, '')    // geçersiz karakterleri temizle
        .toUpperCase();

    const key = `CATEGORY.${normalized}`;
    const value = this.translate.instant(key);

    // Çeviri bulunursa onu döndür
    if (value && value !== key) {
      return value;
    }

    // Fallback: "WEB_DEVELOPMENT" -> "Web Development"
    return normalized
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/(^|\s)\S/g, m => m.toUpperCase());
  }

  getLevelTranslation(level: CourseLevel): string {
    if (!level) return '';

    // Normalizasyon: "Beginner Level" -> "BEGINNER_LEVEL"
    const normalized = level
        .toString()
        .trim()
        .replace(/[-\s]+/g, '_')
        .replace(/[^\w]/g, '')
        .toUpperCase();

    const key = `LEVEL.${normalized}`;
    const value = this.translate.instant(key);

    if (value && value !== key) {
      return value;
    }

    // Fallback: "BEGINNER_LEVEL" -> "Beginner Level"
    return normalized
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/(^|\s)\S/g, m => m.toUpperCase());
  }


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

  getStarArray(rating: number): Array<{filled: boolean, half: boolean}> {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push({filled: true, half: false});
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push({filled: false, half: true});
      } else {
        stars.push({filled: false, half: false});
      }
    }

    return stars;
  }

  getAverageRating(): number {
    if (!this.courseReviews.length) return 0;
    const total = this.courseReviews.reduce((sum, review) => sum + review.rating, 0);
    return total / this.courseReviews.length;
  }

  // ========== TYPE GUARDS ==========

  isCourseDetailsResponse(course: CourseResponse | CourseDetailsResponse): course is CourseDetailsResponse {
    return 'lessons' in course && 'requirements' in course;
  }

  hasLessons(): boolean {
    return this.isCourseDetailsResponse(this.course!) && this.course.lessons && this.course.lessons.length > 0;
  }

  hasRequirements(): boolean {
    return this.isCourseDetailsResponse(this.course!) && this.course.requirements && this.course.requirements.length > 0;
  }

  hasWhatYouWillLearn(): boolean {
    return this.isCourseDetailsResponse(this.course!) && this.course.whatYouWillLearn && this.course.whatYouWillLearn.length > 0;
  }

  hasTargetAudience(): boolean {
    return this.isCourseDetailsResponse(this.course!) && this.course.targetAudience && this.course.targetAudience.length > 0;
  }

  getCourseRequirements(): string[] {
    return this.isCourseDetailsResponse(this.course!) ? (this.course.requirements || []) : [];
  }

  getCourseWhatYouWillLearn(): string[] {
    return this.isCourseDetailsResponse(this.course!) ? (this.course.whatYouWillLearn || []) : [];
  }

  getCourseTargetAudience(): string[] {
    return this.isCourseDetailsResponse(this.course!) ? (this.course.targetAudience || []) : [];
  }

  getCourseLessons(): LessonDTO[] {
    if (this.isCourseDetailsResponse(this.course!) && this.course.lessons) {
      return [...this.course.lessons].sort((a, b) => a.lessonOrder - b.lessonOrder);
    }
    return this.course?.lessons || [];
  }

  // ========== NAVIGATION HELPERS ==========

  navigateToLessonEdit(lessonId: number): void {
    if (this.courseId) {
      this.router.navigate(['/courses', this.courseId, 'lessons', lessonId, 'edit']);
    }
  }

  navigateToCourseEdit(): void {
    if (this.courseId) {
      this.router.navigate(['/courses', this.courseId, 'edit']);
    }
  }

  navigateToAddLesson(): void {
    if (this.courseId) {
      this.router.navigate(['/courses', this.courseId, 'lessons', 'new']);
    }
  }

  navigateToPlayLesson(lessonId: number): void {
    if (this.courseId) {
      this.router.navigate(['/courses', this.courseId, 'lessons', lessonId]);
    }
  }

  // ========== FORM GETTERS ==========

  get rating() { return this.reviewForm.get('rating'); }
  get comment() { return this.reviewForm.get('comment'); }

  // ========== MESSAGE HANDLING ==========

  clearMessages(): void {
    this.updateState({
      errorMessage: null,
      successMessage: null
    });
  }

  // ========== STATE MANAGEMENT ==========

  private updateState(partialState: Partial<ComponentState>): void {
    this.currentState = { ...this.currentState, ...partialState };
  }

  // ========== TRACK BY FUNCTIONS ==========

  trackByLessonId(index: number, lesson: LessonDTO): number {
    return lesson.id;
  }

  trackByReviewId(index: number, review: ReviewResponse): number {
    return review.id;
  }

  trackByRequirementIndex(index: number, requirement: string): number {
    return index;
  }

  goToInsProfile() {
    if (this.isLoggedIn){
      this.router.navigate(['/instructor', this.course?.instructorId]);
    }else {
      this.router.navigate(['/auth/login']);
    }
  }

  editReview(id: number) {
    // Find the review to edit
    const reviewToEdit = this.courseReviews.find(review => review.id === id);
    if (reviewToEdit && this.canModifyReview(reviewToEdit)) {
      this.userReview = reviewToEdit;
      this.toggleReviewForm();
    }
  }
}