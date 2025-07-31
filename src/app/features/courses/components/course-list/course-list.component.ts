import { Component, OnInit, OnDestroy, HostListener, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, ElementRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, interval, Subscription, BehaviorSubject, combineLatest } from 'rxjs';
import { takeUntil, catchError, finalize, debounceTime, distinctUntilChanged, tap, switchMap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

// Services
import { CourseService } from '../../services/course.service';
import { AuthService } from '../../../../core/services/auth.service';
import { TokenService } from '../../../../core/services/token.service';

// Models
import { CourseResponse, CourseCategory, CourseLevel } from '../../models/course.models';


// Components
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertDialogComponent } from '../../../../shared/components/alert-dialog/alert-dialog.component';
import {UserProfile} from "../../../auth/models/auth.models";

// Interfaces
interface SliderConfig {
  currentSlide: number;
  maxSlide: number;
  slideWidth: number;
  slidesPerView: number;
  autoSlideEnabled: boolean;
  autoSlideInterval: number;
}

interface ResponsiveBreakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
  large: number;
}

interface ComponentState {
  isLoading: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  showCallToActionForTopSelling: boolean;
  isLoggedIn: boolean;
  currentUser: UserProfile | null;
}

@Component({
  selector: 'app-course-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    LoadingSpinnerComponent,
    AlertDialogComponent
  ],
  templateUrl: './course-list.component.html',
  styleUrl: './course-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseListComponent implements OnInit, OnDestroy {

  // ViewChild references
  @ViewChild('sliderWrapper', { static: false }) sliderWrapper!: ElementRef<HTMLDivElement>;

  // Data properties
  topSellingCourses: CourseResponse[] = [];
  allCourses: CourseResponse[] = [];
  personalizedCategory: CourseCategory | null = null;

  // State management
  private componentState$ = new BehaviorSubject<ComponentState>({
    isLoading: true,
    errorMessage: null,
    successMessage: null,
    showCallToActionForTopSelling: false,
    isLoggedIn: false,
    currentUser: null
  });

  // Public state getters
  get isLoading(): boolean { return this.componentState$.value.isLoading; }
  get errorMessage(): string | null { return this.componentState$.value.errorMessage; }
  get successMessage(): string | null { return this.componentState$.value.successMessage; }
  get showCallToActionForTopSelling(): boolean { return this.componentState$.value.showCallToActionForTopSelling; }
  get isLoggedIn(): boolean { return this.componentState$.value.isLoggedIn; }
  get currentUser(): UserProfile | null { return this.componentState$.value.currentUser; }
  get currentUserId(): number | null { return this.currentUser?.id ? parseInt(String(this.currentUser.id)) : null; }

  // Slider configuration
  private sliderConfig$ = new BehaviorSubject<SliderConfig>({
    currentSlide: 0,
    maxSlide: 0,
    slideWidth: 100,
    slidesPerView: 1,
    autoSlideEnabled: true,
    autoSlideInterval: 4000
  });

  // Public slider getters
  get currentSlide(): number { return this.sliderConfig$.value.currentSlide; }
  get maxSlide(): number { return this.sliderConfig$.value.maxSlide; }
  get slideWidth(): number { return this.sliderConfig$.value.slideWidth; }
  get slidesPerView(): number { return this.sliderConfig$.value.slidesPerView; }
  get slideIndicators(): number[] {
    const totalSlides = Math.ceil(this.topSellingCourses.length / this.slidesPerView);
    return Array.from({ length: totalSlides }, (_, i) => i);
  }

  // Configuration constants
  private readonly BREAKPOINTS: ResponsiveBreakpoints = {
    mobile: 480,
    tablet: 768,
    desktop: 1024,
    large: 1400
  };

  private readonly EXTERNAL_PURCHASE_URL = 'https://egitimmerkezi.com';
  private readonly DEFAULT_PLACEHOLDER_IMAGE = 'assets/images/course-placeholder.jpg';

  // Subscriptions
  private autoSlideSubscription?: Subscription;
  private resizeSubscription?: Subscription;
  private destroy$ = new Subject<void>();

  // Performance optimization
  private resizeSubject$ = new Subject<Event>();

  constructor(
      private courseService: CourseService,
      private authService: AuthService,
      private translate: TranslateService,
      private tokenService: TokenService,
      private cdr: ChangeDetectorRef,
      @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.setupResizeHandler();
  }

  ngOnInit(): void {
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    // Only handle resize in browser environment
    if (isPlatformBrowser(this.platformId)) {
      this.resizeSubject$.next(event);
    }
  }

  // ========== INITIALIZATION METHODS ==========

  private initializeComponent(): void {
    this.updateState({ isLoading: true });

    // Setup user authentication state
    this.setupAuthenticationListener();

    // Setup window resize handler (only in browser)
    if (isPlatformBrowser(this.platformId)) {
      this.calculateResponsiveSlides();
    } else {
      // Set default values for server-side rendering
      this.updateSliderConfig({ slidesPerView: 1 });
    }
  }

  private setupAuthenticationListener(): void {
    this.authService.getCurrentUser()
        .pipe(
            takeUntil(this.destroy$),
            distinctUntilChanged((prev, curr) => prev?.id === curr?.id),
            tap(user => {
              this.updateState({
                isLoggedIn: !!user,
                currentUser: user
              });
            }),
            switchMap(() => this.loadAllData())
        )
        .subscribe({
          next: () => {
            this.updateState({ isLoading: false });
            this.cdr.markForCheck();
          },
          error: (error) => {
            this.handleError('Failed to load user data', error);
          }
        });
  }

  private setupResizeHandler(): void {
    // Only setup resize handler in browser environment
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.resizeSubscription = this.resizeSubject$
        .pipe(
            debounceTime(150),
            takeUntil(this.destroy$)
        )
        .subscribe(() => {
          this.calculateResponsiveSlides();
          this.updateSliderDimensions();
          this.cdr.markForCheck();
        });
  }

  // ========== DATA LOADING METHODS ==========

  private loadAllData(): Observable<void> {
    return new Observable(observer => {
      combineLatest([
        this.loadTopSellingCoursesObservable(),
        this.loadPurchasedCoursesObservable()
      ]).pipe(
          takeUntil(this.destroy$),
          finalize(() => {
            this.initializeSlider();
            observer.complete();
          })
      ).subscribe({
        next: ([topSelling, purchased]) => {
          this.topSellingCourses = topSelling;
          this.allCourses = purchased;
          observer.next();
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  private loadTopSellingCoursesObservable(): Observable<CourseResponse[]> {
    this.updateState({
      showCallToActionForTopSelling: false,
      errorMessage: null
    });

    let fetchObservable: Observable<CourseResponse[]>;
    let isPersonalizedAttempt = false;

    if (this.isLoggedIn && this.currentUserId) {
      isPersonalizedAttempt = true;
      fetchObservable = this.courseService.getRecommendedCourses(this.currentUserId, 8).pipe(
          catchError(err => {
            console.warn('Personalized recommendations failed, falling back to top selling:', err);
            isPersonalizedAttempt = false;
            return this.courseService.getTopSellingCourses(8, false, null);
          })
      );
    } else {
      fetchObservable = this.courseService.getTopSellingCourses(8, false, null);
    }

    return fetchObservable.pipe(
        catchError(error => {
          console.error('Error loading top selling courses:', error);
          this.updateState({
            showCallToActionForTopSelling: true,
            errorMessage: this.translate.instant('COURSE_LOAD_ERROR')
          });
          return of([]);
        }),
        tap(courses => {
          if (courses && courses.length > 0) {
            this.updateState({ showCallToActionForTopSelling: false });
            this.personalizedCategory = isPersonalizedAttempt && courses[0]?.category ? courses[0].category : null;
          } else {
            this.updateState({ showCallToActionForTopSelling: true });
            this.personalizedCategory = null;
          }
        })
    );
  }

  private loadPurchasedCoursesObservable(): Observable<CourseResponse[]> {
    if (!this.isLoggedIn || !this.currentUserId) {
      return of([]);
    }

    return this.courseService.getPurchasedCoursesByUserId(this.currentUserId).pipe(
        catchError(error => {
          console.error('Error loading purchased courses:', error);
          this.updateState({
            errorMessage: this.translate.instant('PURCHASED_COURSES_LOAD_ERROR')
          });
          return of([]);
        })
    );
  }

  // ========== SLIDER METHODS ==========

  private initializeSlider(): void {
    if (this.topSellingCourses.length === 0) return;

    this.calculateResponsiveSlides();
    this.updateSliderDimensions();
    this.startAutoSlide();
  }

  private calculateResponsiveSlides(): void {
    // Only calculate in browser environment
    if (!isPlatformBrowser(this.platformId)) {
      this.updateSliderConfig({ slidesPerView: 1 });
      return;
    }

    const screenWidth = window.innerWidth;
    let slidesPerView = 1;

    if (screenWidth >= this.BREAKPOINTS.large) {
      slidesPerView = 4;
    } else if (screenWidth >= this.BREAKPOINTS.desktop) {
      slidesPerView = 3;
    } else if (screenWidth >= this.BREAKPOINTS.tablet) {
      slidesPerView = 2;
    } else {
      slidesPerView = 1;
    }

    this.updateSliderConfig({ slidesPerView });
  }

  private updateSliderDimensions(): void {
    if (this.topSellingCourses.length === 0) return;

    const { slidesPerView } = this.sliderConfig$.value;
    const slideWidth = 100 / slidesPerView;
    const maxSlide = Math.max(0, Math.ceil(this.topSellingCourses.length / slidesPerView) - 1);
    const currentSlide = Math.min(this.currentSlide, maxSlide);

    this.updateSliderConfig({
      slideWidth,
      maxSlide,
      currentSlide
    });
  }

  private startAutoSlide(): void {
    // Only start auto slide in browser environment
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const config = this.sliderConfig$.value;

    if (!config.autoSlideEnabled || this.topSellingCourses.length <= config.slidesPerView) {
      return;
    }

    this.stopAutoSlide();

    this.autoSlideSubscription = interval(config.autoSlideInterval)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.nextSlide();
        });
  }

  private stopAutoSlide(): void {
    if (this.autoSlideSubscription) {
      this.autoSlideSubscription.unsubscribe();
      this.autoSlideSubscription = undefined;
    }
  }

  nextSlide(): void {
    const { currentSlide, maxSlide } = this.sliderConfig$.value;
    const newSlide = currentSlide < maxSlide ? currentSlide + 1 : 0;

    this.updateSliderConfig({ currentSlide: newSlide });
    this.restartAutoSlide();
    this.cdr.markForCheck();
  }

  previousSlide(): void {
    const { currentSlide, maxSlide } = this.sliderConfig$.value;
    const newSlide = currentSlide > 0 ? currentSlide - 1 : maxSlide;

    this.updateSliderConfig({ currentSlide: newSlide });
    this.restartAutoSlide();
    this.cdr.markForCheck();
  }

  goToSlide(slideIndex: number): void {
    const { maxSlide } = this.sliderConfig$.value;
    const newSlide = Math.min(slideIndex, maxSlide);

    this.updateSliderConfig({ currentSlide: newSlide });
    this.restartAutoSlide();
    this.cdr.markForCheck();
  }

  private restartAutoSlide(): void {
    if (this.sliderConfig$.value.autoSlideEnabled) {
      this.stopAutoSlide();
      setTimeout(() => this.startAutoSlide(), 1000);
    }
  }

  onSliderMouseEnter(): void {
    this.stopAutoSlide();
  }

  onSliderMouseLeave(): void {
    if (this.sliderConfig$.value.autoSlideEnabled) {
      this.startAutoSlide();
    }
  }

  // ========== UTILITY METHODS ==========

  goToExternalPurchaseSite(): void {
    // Only open window in browser environment
    if (!isPlatformBrowser(this.platformId)) {
      console.warn('Cannot open external site in server-side environment');
      return;
    }

    try {
      window.open(this.EXTERNAL_PURCHASE_URL, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Failed to open external purchase site:', error);
      this.updateState({
        errorMessage: this.translate.instant('EXTERNAL_SITE_ERROR')
      });
    }
  }

  getCategoryTranslation(category: CourseCategory): string {
    return this.translate.instant(`CATEGORY.${category.toUpperCase()}`);
  }

  getLevelTranslation(level: string): string {
    return this.translate.instant(`LEVEL.${level.toUpperCase()}`);
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
      console.warn('Price formatting failed:', error);
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

  getStarArray(rating: number): boolean[] {
    const stars: boolean[] = [];
    const fullStars = Math.floor(Math.max(0, Math.min(5, rating)));

    for (let i = 0; i < 5; i++) {
      stars.push(i < fullStars);
    }

    return stars;
  }

  onCourseClick(courseId: number): void {
    console.log('Course clicked:', courseId);

    // Analytics tracking could be added here
    // this.analytics.trackEvent('course_click', { courseId });
  }

  // ========== MESSAGE HANDLING ==========

  clearMessages(): void {
    this.updateState({
      errorMessage: null,
      successMessage: null
    });
    this.cdr.markForCheck();
  }

  refreshPage(): void {
    this.updateState({ isLoading: true });

    this.loadAllData().pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.updateState({ isLoading: false });
          this.cdr.markForCheck();
        })
    ).subscribe({
      next: () => {
        this.updateState({
          successMessage: this.translate.instant('DATA_REFRESHED')
        });
      },
      error: (error) => {
        this.handleError('Failed to refresh data', error);
      }
    });
  }

  // ========== STATE MANAGEMENT ==========

  private updateState(partialState: Partial<ComponentState>): void {
    const currentState = this.componentState$.value;
    this.componentState$.next({ ...currentState, ...partialState });
  }

  private updateSliderConfig(partialConfig: Partial<SliderConfig>): void {
    const currentConfig = this.sliderConfig$.value;
    this.sliderConfig$.next({ ...currentConfig, ...partialConfig });
  }

  private handleError(message: string, error: any): void {
    console.error(message, error);

    let errorMessage = this.translate.instant('GENERIC_ERROR');

    if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (error?.message) {
      errorMessage = error.message;
    }

    this.updateState({
      errorMessage,
      isLoading: false
    });
    this.cdr.markForCheck();
  }

  // ========== BROWSER DETECTION UTILITY ==========

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private getScreenWidth(): number {
    if (!this.isBrowser()) {
      return this.BREAKPOINTS.desktop; // Default fallback for SSR
    }
    return window.innerWidth;
  }

  // ========== LIFECYCLE HOOKS ==========

  ngAfterViewInit(): void {
    // Initialize slider after view is ready (browser only)
    if (this.isBrowser()) {
      setTimeout(() => {
        this.calculateResponsiveSlides();
        this.updateSliderDimensions();
        this.cdr.markForCheck();
      });
    }
  }

  private cleanup(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopAutoSlide();

    if (this.resizeSubscription) {
      this.resizeSubscription.unsubscribe();
    }
  }

  // ========== PERFORMANCE OPTIMIZATION ==========

  trackByCourseId(index: number, course: CourseResponse): number {
    return course.id;
  }

  trackBySlideIndex(index: number): number {
    return index;
  }

  // ========== ACCESSIBILITY ==========

  getSlideAriaLabel(index: number): string {
    return this.translate.instant('SLIDE_ARIA_LABEL', {
      current: index + 1,
      total: this.slideIndicators.length
    });
  }

  getCourseAriaLabel(course: CourseResponse): string {
    return this.translate.instant('COURSE_ARIA_LABEL', {
      title: course.title,
      instructor: course.instructorName,
      price: this.formatPrice(course.price)
    });
  }
}