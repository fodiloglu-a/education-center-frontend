import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { takeUntil, catchError, finalize, distinctUntilChanged, tap, switchMap, debounceTime } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { FormsModule } from '@angular/forms';

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
  errorMessage: string | null;
  successMessage: string | null;
  isLoggedIn: boolean;
  currentUser: UserProfile | null;
  viewMode: 'grid' | 'list';
  showFilters: boolean;
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
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseListComponent implements OnInit, OnDestroy {

  // Data properties
  allCourses: CourseResponse[] = [];
  filteredCourses: CourseResponse[] = [];
  categories = Object.values(CourseCategory);
  levels = Object.values(CourseLevel);

  // Filter and search
  private filterSubject$ = new BehaviorSubject<FilterOptions>({
    category: 'ALL',
    sortBy: 'POPULARITY',
    searchTerm: '',
    level: 'ALL'
  });

  private searchSubject$ = new BehaviorSubject<string>('');

  // State management
  private componentState$ = new BehaviorSubject<ComponentState>({
    isLoading: true,
    errorMessage: null,
    successMessage: null,
    isLoggedIn: false,
    currentUser: null,
    viewMode: 'grid',
    showFilters: false
  });

  // Public state getters
  get isLoading(): boolean { return this.componentState$.value.isLoading; }
  get errorMessage(): string | null { return this.componentState$.value.errorMessage; }
  get successMessage(): string | null { return this.componentState$.value.successMessage; }
  get isLoggedIn(): boolean { return this.componentState$.value.isLoggedIn; }
  get currentUser(): UserProfile | null { return this.componentState$.value.currentUser; }
  get viewMode(): 'grid' | 'list' { return this.componentState$.value.viewMode; }
  get showFilters(): boolean { return this.componentState$.value.showFilters; }

  // Filter getters
  get currentFilters(): FilterOptions { return this.filterSubject$.value; }
  get searchTerm(): string { return this.searchSubject$.value; }

  // Configuration
  private readonly COURSES_PER_PAGE = 12;
  private destroy$ = new Subject<void>();

  constructor(
      private courseService: CourseService,
      private authService: AuthService,
      private translate: TranslateService,
      private cdr: ChangeDetectorRef,
      @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.initializeComponent();
    this.setupFilterSubscription();
    this.setupSearchSubscription();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ========== INITIALIZATION ==========

  private initializeComponent(): void {
    this.updateState({ isLoading: true });
    this.setupAuthenticationListener();
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
            switchMap(() => this.loadAllCoursesObservable())
        )
        .subscribe({
          next: () => {
            this.updateState({ isLoading: false });
            this.cdr.markForCheck();
          },
          error: (error) => {
            this.handleError('Failed to load courses', error);
          }
        });
  }

  private setupFilterSubscription(): void {
    this.filterSubject$
        .pipe(
            takeUntil(this.destroy$),
            debounceTime(300),
            distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
        )
        .subscribe(() => {
          this.applyFiltersAndSort();
          this.cdr.markForCheck();
        });
  }

  private setupSearchSubscription(): void {
    this.searchSubject$
        .pipe(
            takeUntil(this.destroy$),
            debounceTime(500),
            distinctUntilChanged()
        )
        .subscribe(searchTerm => {
          this.updateFilters({ searchTerm });
        });
  }

  // ========== DATA LOADING ==========

  private loadAllCoursesObservable(): Observable<CourseResponse[]> {
    return this.courseService.getAllPublishedCourses().pipe(
        catchError(error => {
          console.error('Error loading courses:', error);
          this.updateState({
            errorMessage: this.translate.instant('COURSES_LOAD_ERROR')
          });
          return of([]);
        }),
        tap(courses => {
          this.allCourses = courses;
          this.applyFiltersAndSort();
        })
    );
  }

  // ========== FILTERING AND SORTING ==========

  private applyFiltersAndSort(): void {
    let filtered = [...this.allCourses];
    const filters = this.currentFilters;

    // Search filter
    if (filters.searchTerm.trim()) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(course =>
          course.title.toLowerCase().includes(searchLower) ||
          course.description.toLowerCase().includes(searchLower) ||
          course.instructorName.toLowerCase().includes(searchLower)
      );
    }

    // Category filter
    if (filters.category !== 'ALL') {
      filtered = filtered.filter(course => course.category === filters.category);
    }

    // Level filter
    if (filters.level !== 'ALL') {
      filtered = filtered.filter(course => course.level === filters.level);
    }

    // Price filter
    if (filters.minPrice !== undefined) {
      filtered = filtered.filter(course => course.price >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined) {
      filtered = filtered.filter(course => course.price <= filters.maxPrice!);
    }

    // Sort
    filtered = this.sortCourses(filtered, filters.sortBy);

    this.filteredCourses = filtered;
  }

  private sortCourses(courses: CourseResponse[], sortBy: FilterOptions['sortBy']): CourseResponse[] {
    return courses.sort((a, b) => {
      switch (sortBy) {
        case 'POPULARITY':
          return b.enrollmentCount - a.enrollmentCount;
        case 'PRICE_ASC':
          return a.price - b.price;
        case 'PRICE_DESC':
          return b.price - a.price;
        case 'RATING':
          return b.averageRating - a.averageRating;
        case 'NEWEST':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });
  }

  // ========== FILTER CONTROLS ==========

  updateFilters(partialFilters: Partial<FilterOptions>): void {
    const currentFilters = this.filterSubject$.value;
    this.filterSubject$.next({ ...currentFilters, ...partialFilters });
  }

  updateSearch(searchTerm: string): void {
    this.searchSubject$.next(searchTerm);
  }

  resetFilters(): void {
    this.filterSubject$.next({
      category: 'ALL',
      sortBy: 'POPULARITY',
      searchTerm: '',
      level: 'ALL',
      minPrice: undefined,
      maxPrice: undefined
    });
    this.searchSubject$.next('');
  }

  toggleFilters(): void {
    this.updateState({ showFilters: !this.showFilters });
  }

  toggleViewMode(): void {
    const newMode = this.viewMode === 'grid' ? 'list' : 'grid';
    this.updateState({ viewMode: newMode });
  }

  // ========== EVENT HANDLERS ==========

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.updateSearch(input?.value || '');
  }

  onSortChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.updateFilters({ sortBy: select?.value as FilterOptions['sortBy'] });
  }

  onCategoryChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.updateFilters({ category: select?.value as CourseCategory | 'ALL' });
  }

  onLevelChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.updateFilters({ level: select?.value as CourseLevel | 'ALL' });
  }

  onMinPriceInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input?.value;
    this.updateFilters({
      minPrice: value && value.trim() !== '' ? +value : undefined
    });
  }

  onMaxPriceInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input?.value;
    this.updateFilters({
      maxPrice: value && value.trim() !== '' ? +value : undefined
    });
  }

  getCategoryTranslation(category: CourseCategory): string {
    return this.translate.instant(`CATEGORY.${category}`);
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
    return this.translate.instant(`LEVEL.${level}`);
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
      return `${hours}s ${mins}dk`;
    } else if (hours > 0) {
      return `${hours} saat`;
    } else {
      return `${mins} dakika`;
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

  onCourseClick(courseId: number): void {
    console.log('Course clicked:', courseId);
  }

  // ========== MESSAGE HANDLING ==========

  clearMessages(): void {
    this.updateState({
      errorMessage: null,
      successMessage: null
    });
  }

  refreshCourses(): void {
    this.updateState({ isLoading: true });
    this.loadAllCoursesObservable().pipe(
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
        this.handleError('Failed to refresh courses', error);
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

  // ========== TRACK BY FUNCTIONS ==========

  trackByCourseId(index: number, course: CourseResponse): number {
    return course.id;
  }
}