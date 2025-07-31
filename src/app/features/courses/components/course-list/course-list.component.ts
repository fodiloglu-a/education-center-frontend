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

// Interfaces (Slider ile ilgili olanlar kaldırıldı)
interface ComponentState {
  isLoading: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  showCallToActionForTopSelling: boolean; // Her zaman true olacak
  isLoggedIn: boolean;
  currentUser: UserProfile | null;
}

// Responsive Breakpoints artık sadece CSS'te yönetiliyor veya burada kullanılmıyor.
// interface ResponsiveBreakpoints {
//   mobile: number;
//   tablet: number;
//   desktop: number;
//   large: number;
// }

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

  // Data properties
  // topSellingCourses: CourseResponse[] = []; // KALDIRILDI
  allCourses: CourseResponse[] = [];
  personalizedCategory: CourseCategory | null = null; // Bu değişkenin kullanımı azalacak/değişecek

  // State management
  private componentState$ = new BehaviorSubject<ComponentState>({
    isLoading: true,
    errorMessage: null,
    successMessage: null,
    showCallToActionForTopSelling: true, // Her zaman true olarak ayarlandı
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

  // Slider configuration (Kaldırıldı)
  // private sliderConfig$ = new BehaviorSubject<SliderConfig>(...);
  // Public slider getters (Kaldırıldı)
  // get currentSlide(): number { ... }
  // get maxSlide(): number { ... }
  // get slideWidth(): number { ... }
  // get slidesPerView(): number { ... }
  // get slideIndicators(): number[] { ... }

  // Configuration constants (Breakpointler hala CSS için kullanılabilir)
  private readonly BREAKPOINTS = { // Sadece TypeScript'te kullanılıyorsa tanımlı kalsın
    mobile: 480,
    tablet: 768,
    desktop: 1024,
    large: 1400
  };

  private readonly EXTERNAL_PURCHASE_URL = 'https://egitimmerkezi.com';
  private readonly DEFAULT_PLACEHOLDER_IMAGE = 'assets/images/course-placeholder.jpg';

  // Subscriptions (Slider ile ilgili olanlar kaldırıldı)
  // private autoSlideSubscription?: Subscription;
  private resizeSubscription?: Subscription; // Resize hala kullanılabilir
  private destroy$ = new Subject<void>();

  // Performance optimization (Kaldırıldı)
  // private resizeSubject$ = new Subject<Event>();

  constructor(
      private courseService: CourseService,
      private authService: AuthService,
      private translate: TranslateService,
      private tokenService: TokenService,
      private cdr: ChangeDetectorRef,
      @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // this.setupResizeHandler(); // Slider kaldırıldığı için buna gerek kalmayabilir
  }

  ngOnInit(): void {
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  // @HostListener('window:resize', ['$event']) (Kaldırıldı)
  // onResize(event: Event): void { ... }

  // ========== INITIALIZATION METHODS ==========

  private initializeComponent(): void {
    this.updateState({ isLoading: true, showCallToActionForTopSelling: true }); // Her zaman CTA göster

    this.setupAuthenticationListener();

    // Slider kaldırıldığı için responsive slide hesaplamasına gerek kalmadı.
    // if (isPlatformBrowser(this.platformId)) {
    //   this.calculateResponsiveSlides();
    // } else {
    //   this.updateSliderConfig({ slidesPerView: 1 });
    // }
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
            // Sadece satın alınan kursları yükle (TopSelling artık sadece CTA)
            switchMap(() => this.loadPurchasedCoursesObservable())
        )
        .subscribe({
          next: () => {
            this.updateState({ isLoading: false });
            this.cdr.markForCheck();
          },
          error: (error) => {
            this.handleError('Failed to load user data or courses', error);
          }
        });
  }

  // private setupResizeHandler(): void { ... } // Slider kaldırıldığı için kaldırıldı

  // ========== DATA LOADING METHODS ==========

  // loadAllData kaldırıldı, çünkü artık sadece loadPurchasedCoursesObservable çağrılıyor
  // private loadAllData(): Observable<void> { ... }

  // loadTopSellingCoursesObservable metodunun kendisi basitleştirildi
  private loadTopSellingCoursesObservable(): Observable<CourseResponse[]> {
    // Top selling kursları çekme mantığı kaldırıldı, her zaman boş bir dizi dönecek
    // Çünkü bu bölüm sadece CTA için kullanılacak.
    this.updateState({
      showCallToActionForTopSelling: true, // Her zaman CTA göster
      errorMessage: null
    });
    // this.topSellingCourses = []; // KALDIRILDI
    return of([]);
  }

  private loadPurchasedCoursesObservable(): Observable<CourseResponse[]> {
    if (!this.isLoggedIn || !this.currentUserId) {
      this.updateState({
        errorMessage: null // Satın alınan kurs yoksa hata mesajı gösterme
      });
      this.allCourses = []; // Kullanıcı giriş yapmamışsa veya ID yoksa boş dizi
      return of([]);
    }

    return this.courseService.getPurchasedCoursesByUserId(this.currentUserId).pipe(
        catchError(error => {
          console.error('Error loading purchased courses:', error);
          this.updateState({
            errorMessage: this.translate.instant('PURCHASED_COURSES_LOAD_ERROR')
          });
          this.allCourses = []; // Hata durumunda boş dizi
          return of([]);
        }),
        tap(courses => {
          this.allCourses = courses; // Satın alınan kursları ata
        })
    );
  }

  // ========== SLIDER METHODS (Kaldırıldı) ==========
  // private initializeSlider(): void { ... }
  // private calculateResponsiveSlides(): void { ... }
  // private updateSliderDimensions(): void { ... }
  // private startAutoSlide(): void { ... }
  // private stopAutoSlide(): void { ... }
  // nextSlide(): void { ... }
  // previousSlide(): void { ... }
  // goToSlide(slideIndex: number): void { ... }
  // private restartAutoSlide(): void { ... }
  // onSliderMouseEnter(): void { ... }
  // onSliderMouseLeave(): void { ... }

  // ========== UTILITY METHODS ==========

  goToExternalPurchaseSite(): void {
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
    // loadAllData yerine sadece satın alınan kursları yükle
    this.loadPurchasedCoursesObservable().pipe(
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
    // Slider kaldırıldığı için bu metoda gerek kalmadı
    // if (this.isBrowser()) {
    //   setTimeout(() => {
    //     this.calculateResponsiveSlides();
    //     this.updateSliderDimensions();
    //     this.cdr.markForCheck();
    //   });
    // }
  }

  private cleanup(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // this.stopAutoSlide(); // Slider kaldırıldığı için kaldırıldı

    if (this.resizeSubscription) {
      this.resizeSubscription.unsubscribe();
    }
  }

  // ========== PERFORMANCE OPTIMIZATION (Kaldırıldı) ==========
  // trackByCourseId(index: number, course: CourseResponse): number { ... }
  // trackBySlideIndex(index: number): number { ... }

  // ========== ACCESSIBILITY (Slider ile ilgili olanlar kaldırıldı) ==========
  // getSlideAriaLabel(index: number): string { ... }
  // getCourseAriaLabel(course: CourseResponse): string { ... }
}