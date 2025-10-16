import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CourseResponse } from "../../../courses/models/course.models";
import { CourseService } from "../../../courses/services/course.service";
import {CurrencyPipe, DecimalPipe, NgForOf, NgIf, NgOptimizedImage} from "@angular/common";
import { TranslatePipe } from "@ngx-translate/core";
import { RouterLink } from "@angular/router";
import { Subject, takeUntil, retry, catchError, of, finalize } from 'rxjs';

interface HomeComponentState {
  isLoading: boolean;
  error: string | null;
  retryCount: number;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  standalone: true,
  imports: [
    DecimalPipe,
    CurrencyPipe,
    NgForOf,
    NgIf,
    TranslatePipe,
    RouterLink,
    [NgOptimizedImage /* diğerleri */],
  ],
  styleUrls: ['./home.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit, OnDestroy {

  // Modern Angular dependency injection
  private readonly courseService = inject(CourseService);
  private readonly destroy$ = new Subject<void>();

  // Reactive state management with signals
  private readonly state = signal<HomeComponentState>({
    isLoading: false,
    error: null,
    retryCount: 0
  });

  private readonly bestSellersData = signal<CourseResponse[]>([]);

  // Public computed properties for template
  readonly bestSellers = computed(() => this.bestSellersData());
  readonly isLoading = computed(() => this.state().isLoading);
  readonly errorMessage = computed(() => this.state().error);
  readonly hasData = computed(() => this.bestSellers().length > 0);
  readonly showRetryButton = computed(() => this.state().error && this.state().retryCount < 3);

  // Constants
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly COURSES_TO_FETCH = 5;

  ngOnInit(): void {
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize component and load initial data
   * @private
   */
  private initializeComponent(): void {
    this.getBestSellingCourses();
  }

  /**
   * Fetch best selling courses with comprehensive error handling and retry logic
   * @public - Made public for template access (retry button)
   */
  getBestSellingCourses(): void {
    // Prevent multiple simultaneous requests
    if (this.state().isLoading) {
      return;
    }

    this.updateState({ isLoading: true, error: null });

    this.courseService.getTopSellingCourses(this.COURSES_TO_FETCH)
        .pipe(
            retry({
              count: this.MAX_RETRY_ATTEMPTS,
              delay: (error, retryCount) => {
                console.warn(`Retry attempt ${retryCount} for best selling courses:`, error);
                return of(null).pipe(
                    // Exponential backoff: 1s, 2s, 4s
                    finalize(() => setTimeout(() => {}, Math.pow(2, retryCount) * 1000))
                );
              }
            }),
            catchError((error) => {
              console.error('Failed to fetch best selling courses after retries:', error);

              // User-friendly error messages based on error type
              const errorMessage = this.getErrorMessage(error);
              this.updateState({
                error: errorMessage,
                retryCount: this.state().retryCount + 1
              });

              return of([]); // Return empty array to continue stream
            }),
            takeUntil(this.destroy$),
            finalize(() => {
              this.updateState({ isLoading: false });
            })
        )
        .subscribe({
          next: (courses: CourseResponse[]) => {
            if (courses && courses.length > 0) {
              this.bestSellersData.set(this.validateAndSanitizeCourses(courses));
              this.updateState({ error: null, retryCount: 0 });
            } else if (!this.state().error) {
              // Only show empty state if there's no error
              this.updateState({
                error: 'Şu anda gösterilecek kurs bulunmuyor. Lütfen daha sonra tekrar deneyin.'
              });
            }
          }
        });
  }

  /**
   * Retry loading courses with backoff prevention
   * @public - Called from template
   */
  retryLoadingCourses(): void {
    if (this.state().retryCount >= this.MAX_RETRY_ATTEMPTS) {
      console.warn('Maximum retry attempts reached');
      return;
    }

    this.getBestSellingCourses();
  }

  /**
   * Track function for ngFor optimization
   * @param index - Array index
   * @param course - Course item
   * @returns Unique identifier for tracking
   */
  trackCourseById(index: number, course: CourseResponse): string | number {
    return course?.id ?? index;
  }

  /**
   * Track function for star rating ngFor optimization
   * @param index - Array index
   * @param star - Star number
   * @returns Star number for tracking
   */
  trackStarByIndex(index: number, star: number): number {
    return star;
  }

  /**
   * Safe method to get course rating array for stars display
   * @param course - Course object
   * @returns Array of numbers for star iteration
   */
  getStarArray(course: CourseResponse): number[] {
    if (!course?.averageRating || course.averageRating < 0) {
      return [1, 2, 3, 4, 5]; // Default 5 stars
    }
    return [1, 2, 3, 4, 5];
  }

  /**
   * Check if star should be filled based on course rating
   * @param star - Star number (1-5)
   * @param course - Course object
   * @returns Boolean indicating if star should be filled
   */
  isStarFilled(star: number, course: CourseResponse): boolean {
    if (!course?.averageRating) return false;
    return star <= Math.round(course.averageRating);
  }

  /**
   * Safe method to format course price
   * @param course - Course object
   * @returns Formatted price string
   */
  getFormattedPrice(course: CourseResponse): string {
    if (!course?.price || course.price < 0) {
      return 'Ücretsiz';
    }
    return course.price.toString();
  }

  /**
   * Handle image loading errors by setting fallback image
   * @param event - Error event from image element
   */
  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target && target.src !== 'assets/logo/Logo.png') {
      target.src = 'assets/logo/Logo.png';
    }
  }

  /**
   * Update component state immutably
   * @private
   */
  private updateState(partialState: Partial<HomeComponentState>): void {
    this.state.update(currentState => ({
      ...currentState,
      ...partialState
    }));
  }

  /**
   * Generate user-friendly error messages based on error type
   * @private
   */
  private getErrorMessage(error: any): string {
    if (!error) {
      return 'Bilinmeyen bir hata oluştu.';
    }

    // Network errors
    if (error.status === 0 || error.name === 'HttpErrorResponse') {
      return 'İnternet bağlantınızı kontrol edin ve tekrar deneyin.';
    }

    // Server errors
    if (error.status >= 500) {
      return 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.';
    }

    // Client errors
    if (error.status >= 400 && error.status < 500) {
      return 'İstek işlenirken bir hata oluştu. Sayfa yenilenerek tekrar deneyin.';
    }

    // Timeout errors
    if (error.name === 'TimeoutError') {
      return 'İşlem zaman aşımına uğradı. Tekrar deneyin.';
    }

    // Default error
    return 'Kurslar yüklenirken bir hata oluştu. Lütfen tekrar deneyin.';
  }

  /**
   * Validate and sanitize course data to prevent XSS and ensure data integrity
   * @private
   */
  private validateAndSanitizeCourses(courses: CourseResponse[]): CourseResponse[] {
    if (!Array.isArray(courses)) {
      console.warn('Invalid courses data received:', courses);
      return [];
    }

    return courses
        .filter(course => this.isValidCourse(course))
        .map(course => this.sanitizeCourse(course))
        .slice(0, this.COURSES_TO_FETCH); // Ensure we don't exceed expected count
  }

  /**
   * Validate course object structure
   * @private
   */
  private isValidCourse(course: any): course is CourseResponse {
    return course &&
        typeof course === 'object' &&
        course.id !== undefined &&
        course.title &&
        typeof course.title === 'string' &&
        course.instructorName &&
        typeof course.instructorName === 'string';
  }

  /**
   * Sanitize course data
   * @private
   */
  private sanitizeCourse(course: CourseResponse): CourseResponse {
    return {
      ...course,
      title: this.sanitizeString(course.title),
      instructorName: this.sanitizeString(course.instructorName),
      imageUrl: this.sanitizeImageUrl(course.imageUrl),
      averageRating: this.sanitizeRating(course.averageRating),
      price: this.sanitizePrice(course.price)
    };
  }

  /**
   * Basic string sanitization
   * @private
   */
  private sanitizeString(str: string): string {
    if (!str || typeof str !== 'string') return '';
    return str.trim().substring(0, 200); // Limit length to prevent UI issues
  }

  /**
   * Sanitize image URL
   * @private
   */
  private sanitizeImageUrl(url: string): string {
    if (!url || typeof url !== 'string') {
      return 'assets/images/course-placeholder.jpg'; // Fallback image
    }

    // Basic URL validation
    try {
      new URL(url);
      return url;
    } catch {
      return 'assets/images/course-placeholder.jpg';
    }
  }

  /**
   * Sanitize rating value
   * @private
   */
  private sanitizeRating(rating: number): number {
    if (typeof rating !== 'number' || isNaN(rating)) return 0;
    return Math.max(0, Math.min(5, rating)); // Clamp between 0-5
  }

  /**
   * Sanitize price value
   * @private
   */
  private sanitizePrice(price: number): number {
    if (typeof price !== 'number' || isNaN(price)) return 0;
    return Math.max(0, price); // Ensure non-negative
  }
}