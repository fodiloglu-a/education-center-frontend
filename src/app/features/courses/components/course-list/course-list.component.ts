import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { trigger, state, style, transition, animate, keyframes } from '@angular/animations';
import { Subject, BehaviorSubject, combineLatest, timer } from 'rxjs';
import { takeUntil, catchError, finalize, distinctUntilChanged, tap, switchMap, debounceTime, retry, startWith } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { PLATFORM_ID } from '@angular/core';

// Services
import { CourseService } from '../../services/course.service';
import { AuthService } from '../../../../core/services/auth.service';

// Models
import { CourseResponse, CourseCategory, CourseLevel } from '../../models/course.models';
import { UserProfile } from '../../../auth/models/auth.models';

// Components
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertDialogComponent } from '../../../../shared/components/alert-dialog/alert-dialog.component';

// Interfaces
interface FilterOptions {
  category: CourseCategory | 'ALL';
  sortBy: 'POPULARITY' | 'PRICE_ASC' | 'PRICE_DESC' | 'RATING' | 'NEWEST';
  searchTerm: string;
  minPrice?: number;
  maxPrice?: number;
  level?: CourseLevel | 'ALL';
}

interface ComponentState {
  isLoading: boolean;
  isRefreshing: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  isLoggedIn: boolean;
  currentUser: UserProfile | null;
  viewMode: 'grid' | 'list';
  showFilters: boolean;
  retryCount: number;
  lastUpdated: Date | null;
}

@Component({
  selector: 'app-course-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    LoadingSpinnerComponent,
    AlertDialogComponent,
    FormsModule
  ],
  templateUrl: './course-list.component.html',
  styleUrl: './course-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('slideDown', [
      state('void', style({
        opacity: 0,
        transform: 'translateY(-20px)',
        maxHeight: '0px',
        overflow: 'hidden'
      })),
      state('*', style({
        opacity: 1,
        transform: 'translateY(0)',
        maxHeight: '500px',
        overflow: 'visible'
      })),
      transition('void => *', [
        animate('300ms ease-out', keyframes([
          style({ opacity: 0, transform: 'translateY(-20px)', maxHeight: '0px', offset: 0 }),
          style({ opacity: 0.5, transform: 'translateY(-10px)', maxHeight: '250px', offset: 0.5 }),
          style({ opacity: 1, transform: 'translateY(0)', maxHeight: '500px', offset: 1 })
        ]))
      ]),
      transition('* => void', [
        animate('200ms ease-in', keyframes([
          style({ opacity: 1, transform: 'translateY(0)', maxHeight: '500px', offset: 0 }),
          style({ opacity: 0.5, transform: 'translateY(-10px)', maxHeight: '250px', offset: 0.5 }),
          style({ opacity: 0, transform: 'translateY(-20px)', maxHeight: '0px', offset: 1 })
        ]))
      ])
    ]),
    trigger('fadeInUp', [
      state('void', style({
        opacity: 0,
        transform: 'translateY(30px)'
      })),
      state('*', style({
        opacity: 1,
        transform: 'translateY(0)'
      })),
      transition('void => *', [
        animate('400ms ease-out')
      ])
    ]),
    trigger('scaleIn', [
      state('void', style({
        opacity: 0,
        transform: 'scale(0.8)'
      })),
      state('*', style({
        opacity: 1,
        transform: 'scale(1)'
      })),
      transition('void => *', [
        animate('300ms ease-out')
      ])
    ])
  ]
})
export class CourseListComponent implements OnInit, OnDestroy {

  // Modern Angular dependency injection
  private readonly courseService = inject(CourseService);
  private readonly authService = inject(AuthService);
  private readonly translate = inject(TranslateService);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly destroy$ = new Subject<void>();

  // Signal-based reactive state management
  private readonly allCoursesData = signal<CourseResponse[]>([]);
  private readonly componentState = signal<ComponentState>({
    isLoading: true,
    isRefreshing: false,
    errorMessage: null,
    successMessage: null,
    isLoggedIn: false,
    currentUser: null,
    viewMode: 'grid',
    showFilters: false,
    retryCount: 0,
    lastUpdated: null
  });

  private readonly filterOptions = signal<FilterOptions>({
    category: 'ALL',
    sortBy: 'POPULARITY',
    searchTerm: '',
    level: 'ALL'
  });

  // Computed properties for template access
  readonly allCourses = computed(() => this.allCoursesData());
  readonly filteredCourses = computed(() => this.applyFiltersAndSort());
  readonly isLoading = computed(() => this.componentState().isLoading);
  readonly isRefreshing = computed(() => this.componentState().isRefreshing);
  readonly errorMessage = computed(() => this.componentState().errorMessage);
  readonly successMessage = computed(() => this.componentState().successMessage);
  readonly isLoggedIn = computed(() => this.componentState().isLoggedIn);
  readonly currentUser = computed(() => this.componentState().currentUser);
  readonly viewMode = computed(() => this.componentState().viewMode);
  readonly showFilters = computed(() => this.componentState().showFilters);
  readonly currentFilters = computed(() => this.filterOptions());
  readonly searchTerm = computed(() => this.filterOptions().searchTerm);
  readonly canRetry = computed(() => this.componentState().retryCount < this.MAX_RETRY_ATTEMPTS);
  readonly hasData = computed(() => this.allCourses().length > 0);
  readonly resultsCount = computed(() => this.filteredCourses().length);
  readonly totalCount = computed(() => this.allCourses().length);
  readonly lastUpdated = computed(() => this.componentState().lastUpdated);

  // Enhanced computed properties
  readonly hasActiveFilters = computed(() => {
    const filters = this.currentFilters();
    return filters.category !== 'ALL' ||
        filters.level !== 'ALL' ||
        filters.searchTerm.trim() !== '' ||
        filters.minPrice !== undefined ||
        filters.maxPrice !== undefined;
  });

  readonly activeFilterCount = computed(() => {
    let count = 0;
    const filters = this.currentFilters();
    if (filters.category !== 'ALL') count++;
    if (filters.level !== 'ALL') count++;
    if (filters.searchTerm.trim() !== '') count++;
    if (filters.minPrice !== undefined) count++;
    if (filters.maxPrice !== undefined) count++;
    return count;
  });

  readonly isEmptyState = computed(() =>
      !this.isLoading() &&
      !this.errorMessage() &&
      this.resultsCount() === 0
  );

  // Categories and levels for templates
  readonly categories = Object.values(CourseCategory);
  readonly levels = Object.values(CourseLevel);

  // Configuration constants
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly DEBOUNCE_TIME = 300;
  private readonly SEARCH_DEBOUNCE_TIME = 500;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly AUTO_REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes

  // Search and filter subjects
  private readonly searchSubject$ = new BehaviorSubject<string>('');
  private readonly filterSubject$ = new BehaviorSubject<Partial<FilterOptions>>({});

  constructor() {
    // Initialize browser-specific features
    if (isPlatformBrowser(this.platformId)) {
      this.initializeBrowserFeatures();
    }

    // Set up reactive effects
    this.setupFilterEffects();
    this.setupAutoRefresh();
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
    this.setupAuthenticationListener();
    this.setupSearchSubscription();
    this.setupFilterSubscription();
    this.loadStoredPreferences();
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
            switchMap(() => this.loadAllCoursesWithMetrics())
        )
        .subscribe({
          next: () => {
            this.updateState({
              isLoading: false,
              lastUpdated: new Date()
            });
          },
          error: (error) => {
            this.handleError('AUTH_ERROR', error);
          }
        });
  }

  private setupSearchSubscription(): void {
    this.searchSubject$
        .pipe(
            takeUntil(this.destroy$),
            debounceTime(this.SEARCH_DEBOUNCE_TIME),
            distinctUntilChanged()
        )
        .subscribe(searchTerm => {
          this.updateFilters({ searchTerm });
        });
  }

  private setupFilterSubscription(): void {
    this.filterSubject$
        .pipe(
            takeUntil(this.destroy$),
            debounceTime(this.DEBOUNCE_TIME),
            distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
        )
        .subscribe(partialFilters => {
          if (Object.keys(partialFilters).length > 0) {
            const currentFilters = this.filterOptions();
            this.filterOptions.set({ ...currentFilters, ...partialFilters });
            this.savePreferences();
          }
        });
  }

  private setupFilterEffects(): void {
    // Effect to update filtered courses when filters change
    effect(() => {
      const filters = this.currentFilters();
      const courses = this.allCourses();

      if (courses.length > 0) {
        this.updateMetrics({
          filteredCount: this.filteredCourses().length
        });
      }
    });
  }

  private setupAutoRefresh(): void {
    if (isPlatformBrowser(this.platformId)) {
      timer(this.AUTO_REFRESH_INTERVAL, this.AUTO_REFRESH_INTERVAL)
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => {
            if (!this.isLoading() && !this.isRefreshing()) {
              this.refreshCourses(true); // Silent refresh
            }
          });
    }
  }

  private initializeBrowserFeatures(): void {
    // Set up browser-specific features like localStorage, performance monitoring, etc.
    try {
      // Initialize performance monitoring
      if ('performance' in window) {
        this.recordPerformanceMetrics();
      }

      // Set up visibility change listener for optimized loading
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.shouldRefreshData()) {
          this.refreshCourses(true);
        }
      });
    } catch (error) {
      console.warn('Browser features initialization failed:', error);
    }
  }

  // ========== DATA LOADING ==========

  private loadAllCoursesWithMetrics(): Observable<CourseResponse[]> {
    const startTime = performance.now();

    return this.courseService.getAllPublishedCourses().pipe(
        retry({
          count: this.MAX_RETRY_ATTEMPTS,
          delay: (error, retryCount) => {
            console.warn(`Retry attempt ${retryCount} for courses:`, error);
            this.updateState({ retryCount });
            return timer(Math.pow(2, retryCount) * 1000); // Exponential backoff
          }
        }),
        catchError(error => {
          console.error('Error loading courses:', error);
          this.handleError('COURSES_LOAD_ERROR', error);
          return of([]);
        }),
        tap(courses => {
          const loadTime = performance.now() - startTime;
          this.allCoursesData.set(this.validateAndSanitizeCourses(courses));
          this.updateMetrics({
            totalCourses: courses.length,
            loadTime: Math.round(loadTime)
          });
          this.updateState({ retryCount: 0 });
        })
    );
  }

  private applyFiltersAndSort(): CourseResponse[] {
    let filtered = [...this.allCourses()];
    const filters = this.currentFilters();

    try {
      // Search filter with enhanced matching
      if (filters.searchTerm.trim()) {
        const searchTerms = filters.searchTerm.toLowerCase().split(' ').filter(term => term.length > 0);
        filtered = filtered.filter(course => {
          const searchableText = [
            course.title,
            course.description,
            course.instructorName,
            this.getCategoryTranslation(course.category),
            this.getLevelTranslation(course.level)
          ].join(' ').toLowerCase();

          return searchTerms.every(term => searchableText.includes(term));
        });
      }

      // Category filter
      if (filters.category !== 'ALL') {
        filtered = filtered.filter(course => course.category === filters.category);
      }

      // Level filter
      if (filters.level !== 'ALL') {
        filtered = filtered.filter(course => course.level === filters.level);
      }

      // Price filters with validation
      if (filters.minPrice !== undefined && filters.minPrice >= 0) {
        filtered = filtered.filter(course => course.price >= filters.minPrice!);
      }
      if (filters.maxPrice !== undefined && filters.maxPrice >= 0) {
        filtered = filtered.filter(course => course.price <= filters.maxPrice!);
      }

      // Sort with performance optimization
      filtered = this.sortCourses(filtered, filters.sortBy);

      return filtered;
    } catch (error) {
      console.error('Filter application failed:', error);
      return this.allCourses(); // Return unfiltered data as fallback
    }
  }

  private sortCourses(courses: CourseResponse[], sortBy: FilterOptions['sortBy']): CourseResponse[] {
    return courses.sort((a, b) => {
      try {
        switch (sortBy) {
          case 'POPULARITY':
            return (b.enrollmentCount || 0) - (a.enrollmentCount || 0);
          case 'PRICE_ASC':
            return (a.price || 0) - (b.price || 0);
          case 'PRICE_DESC':
            return (b.price || 0) - (a.price || 0);
          case 'RATING':
            return (b.averageRating || 0) - (a.averageRating || 0);
          case 'NEWEST':
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          default:
            return 0;
        }
      } catch (error) {
        console.error('Sort comparison failed:', error);
        return 0;
      }
    });
  }

  // ========== PUBLIC API METHODS ==========

  updateFilters(partialFilters: Partial<FilterOptions>): void {
    this.filterSubject$.next(partialFilters);
  }

  updateSearch(searchTerm: string): void {
    this.searchSubject$.next(searchTerm);
  }

  resetFilters(): void {
    const defaultFilters: FilterOptions = {
      category: 'ALL',
      sortBy: 'POPULARITY',
      searchTerm: '',
      level: 'ALL',
      minPrice: undefined,
      maxPrice: undefined
    };

    this.filterOptions.set(defaultFilters);
    this.searchSubject$.next('');
    this.savePreferences();

    this.updateState({
      successMessage: this.translate.instant('FILTERS_RESET')
    });
  }

  toggleFilters(): void {
    this.updateState({ showFilters: !this.showFilters() });
    this.savePreferences();
  }

  toggleViewMode(): void {
    const newMode = this.viewMode() === 'grid' ? 'list' : 'grid';
    this.updateState({ viewMode: newMode });
    this.savePreferences();
  }

  refreshCourses(silent: boolean = false): void {
    if (!silent) {
      this.updateState({ isRefreshing: true });
    }

    this.loadAllCoursesWithMetrics()
        .pipe(
            takeUntil(this.destroy$),
            finalize(() => {
              this.updateState({
                isRefreshing: false,
                lastUpdated: new Date()
              });
            })
        )
        .subscribe({
          next: () => {
            if (!silent) {
              this.updateState({
                successMessage: this.translate.instant('DATA_REFRESHED')
              });
            }
          },
          error: (error) => {
            this.handleError('REFRESH_ERROR', error);
          }
        });
  }

  retryLoadCourses(): void {
    if (!this.canRetry()) {
      console.warn('Maximum retry attempts reached');
      return;
    }

    this.updateState({
      isLoading: true,
      errorMessage: null
    });

    this.loadAllCoursesWithMetrics()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.updateState({ isLoading: false });
          },
          error: (error) => {
            this.handleError('RETRY_ERROR', error);
          }
        });
  }

  // ========== EVENT HANDLERS ==========

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input?.value?.trim() || '';
    this.updateSearch(value);
  }

  onSortChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select?.value as FilterOptions['sortBy'];
    if (value) {
      this.updateFilters({ sortBy: value });
    }
  }

  onCategoryChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select?.value as CourseCategory | 'ALL';
    if (value) {
      this.updateFilters({ category: value });
    }
  }

  onLevelChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select?.value as CourseLevel | 'ALL';
    if (value) {
      this.updateFilters({ level: value });
    }
  }

  onMinPriceInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input?.value?.trim();
    this.updateFilters({
      minPrice: value && !isNaN(+value) && +value >= 0 ? +value : undefined
    });
  }

  onMaxPriceInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input?.value?.trim();
    this.updateFilters({
      maxPrice: value && !isNaN(+value) && +value >= 0 ? +value : undefined
    });
  }

  onCourseClick(courseId: number): void {
    console.log('Course clicked:', courseId);
    // Add analytics tracking here if needed
  }

  clearMessages(): void {
    this.updateState({
      errorMessage: null,
      successMessage: null
    });
  }

  // ========== UTILITY METHODS ==========

  getCategoryTranslation(category: CourseCategory): string {
    try {
      return this.translate.instant(`CATEGORY.${category}`);
    } catch (error) {
      console.warn('Category translation failed:', error);
      return category;
    }
  }

  getCategoryOptions(): Array<{value: CourseCategory | 'ALL', label: string}> {
    return [
      { value: 'ALL', label: this.translate.instant('ALL_CATEGORIES') },
      ...this.categories.map(cat => ({
        value: cat,
        label: this.getCategoryTranslation(cat)
      }))
    ];
  }

  getLevelTranslation(level: CourseLevel): string {
    try {
      return this.translate.instant(`LEVEL.${level}`);
    } catch (error) {
      console.warn('Level translation failed:', error);
      return level;
    }
  }

  getLevelOptions(): Array<{value: CourseLevel | 'ALL', label: string}> {
    return [
      { value: 'ALL', label: this.translate.instant('ALL_LEVELS') },
      ...this.levels.map(level => ({
        value: level,
        label: this.getLevelTranslation(level)
      }))
    ];
  }

  getSortOptions(): Array<{value: FilterOptions['sortBy'], label: string}> {
    return [
      { value: 'POPULARITY', label: this.translate.instant('SORT_BY_POPULARITY') },
      { value: 'PRICE_ASC', label: this.translate.instant('SORT_BY_PRICE_LOW') },
      { value: 'PRICE_DESC', label: this.translate.instant('SORT_BY_PRICE_HIGH') },
      { value: 'RATING', label: this.translate.instant('SORT_BY_RATING') },
      { value: 'NEWEST', label: this.translate.instant('SORT_BY_NEWEST') }
    ];
  }

  formatPrice(price: number): string {
    if (!price || price <= 0) {
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
    if (!minutes || minutes <= 0) {
      return this.translate.instant('DURATION_NOT_SPECIFIED');
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    try {
      if (hours > 0 && mins > 0) {
        return this.translate.instant('DURATION_HOURS_MINUTES', { hours, minutes: mins });
      } else if (hours > 0) {
        return this.translate.instant('DURATION_HOURS', { hours });
      } else {
        return this.translate.instant('DURATION_MINUTES', { minutes: mins });
      }
    } catch (error) {
      // Fallback to simple format
      if (hours > 0 && mins > 0) {
        return `${hours}s ${mins}dk`;
      } else if (hours > 0) {
        return `${hours} saat`;
      } else {
        return `${mins} dakika`;
      }
    }
  }

  getStarArray(rating: number): Array<{filled: boolean, half: boolean}> {
    const stars = [];
    const safeRating = Math.max(0, Math.min(5, rating || 0));
    const fullStars = Math.floor(safeRating);
    const hasHalfStar = safeRating % 1 >= 0.5;

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

  // ========== DATA VALIDATION ==========

  private validateAndSanitizeCourses(courses: CourseResponse[]): CourseResponse[] {
    if (!Array.isArray(courses)) {
      console.warn('Invalid courses data received:', courses);
      return [];
    }

    return courses
        .filter(course => this.isValidCourse(course))
        .map(course => this.sanitizeCourse(course));
  }

  private isValidCourse(course: any): course is CourseResponse {
    return course &&
        typeof course === 'object' &&
        course.id !== undefined &&
        course.title &&
        typeof course.title === 'string' &&
        course.instructorName &&
        typeof course.instructorName === 'string';
  }

  private sanitizeCourse(course: CourseResponse): CourseResponse {
    return {
      ...course,
      title: this.sanitizeString(course.title),
      description: this.sanitizeString(course.description || ''),
      instructorName: this.sanitizeString(course.instructorName),
      imageUrl: this.sanitizeImageUrl(course.imageUrl),
      averageRating: this.sanitizeRating(course.averageRating),
      price: this.sanitizePrice(course.price),
      enrollmentCount: Math.max(0, course.enrollmentCount || 0),
      duration: Math.max(0, course.duration || 0)
    };
  }

  private sanitizeString(str: string): string {
    if (!str || typeof str !== 'string') return '';
    return str.trim().substring(0, 500); // Prevent excessively long strings
  }

  private sanitizeImageUrl(url: string): string {
    if (!url || typeof url !== 'string') {
      return 'assets/images/course-placeholder.jpg';
    }

    try {
      new URL(url);
      return url;
    } catch {
      return 'assets/images/course-placeholder.jpg';
    }
  }

  private sanitizeRating(rating: number): number {
    if (typeof rating !== 'number' || isNaN(rating)) return 0;
    return Math.max(0, Math.min(5, rating));
  }

  private sanitizePrice(price: number): number {
    if (typeof price !== 'number' || isNaN(price)) return 0;
    return Math.max(0, price);
  }

  // ========== STATE MANAGEMENT ==========

  private updateState(partialState: Partial<ComponentState>): void {
    const currentState = this.componentState();
    this.componentState.set({ ...currentState, ...partialState });
  }

  /**
   * Simple metrics method - logs only, no signal writes
   * @param metrics - Metrics to log
   */
  private updateMetrics(metrics: any): void {
    // Simple logging without signal writes to avoid errors
    console.debug('Course List Metrics:', metrics);
  }

  private handleError(messageKey: string, error: any): void {
    console.error(`Error (${messageKey}):`, error);

    let errorMessage = this.translate.instant('GENERIC_ERROR');

    try {
      if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else {
        errorMessage = this.translate.instant(messageKey);
      }
    } catch (translationError) {
      console.warn('Translation failed for error message:', translationError);
    }

    this.updateState({
      errorMessage,
      isLoading: false,
      isRefreshing: false
    });
  }

  // ========== PREFERENCES AND PERFORMANCE ==========

  private savePreferences(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      const preferences = {
        viewMode: this.viewMode(),
        showFilters: this.showFilters(),
        filters: this.currentFilters()
      };
      localStorage.setItem('course-list-preferences', JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to save preferences:', error);
    }
  }

  private loadStoredPreferences(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      const stored = localStorage.getItem('course-list-preferences');
      if (stored) {
        const preferences = JSON.parse(stored);

        if (preferences.viewMode) {
          this.updateState({ viewMode: preferences.viewMode });
        }

        if (preferences.showFilters !== undefined) {
          this.updateState({ showFilters: preferences.showFilters });
        }

        if (preferences.filters) {
          this.filterOptions.set({ ...this.filterOptions(), ...preferences.filters });
        }
      }
    } catch (error) {
      console.warn('Failed to load preferences:', error);
    }
  }

  private shouldRefreshData(): boolean {
    const lastUpdated = this.lastUpdated();
    if (!lastUpdated) return true;

    const timeSinceUpdate = Date.now() - lastUpdated.getTime();
    return timeSinceUpdate > this.CACHE_DURATION;
  }

  private recordPerformanceMetrics(): void {
    try {
      if ('performance' in window && 'mark' in performance) {
        performance.mark('course-list-init');
      }
    } catch (error) {
      console.warn('Performance metrics recording failed:', error);
    }
  }

  // ========== TRACK BY FUNCTIONS ==========

  trackByCourseId(index: number, course: CourseResponse): number {
    return course?.id ?? index;
  }

  trackByCategoryValue(index: number, item: {value: string, label: string}): string {
    return item?.value ?? index.toString();
  }

  trackByLevelValue(index: number, item: {value: string, label: string}): string {
    return item?.value ?? index.toString();
  }

  trackBySortValue(index: number, item: {value: string, label: string}): string {
    return item?.value ?? index.toString();
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
}