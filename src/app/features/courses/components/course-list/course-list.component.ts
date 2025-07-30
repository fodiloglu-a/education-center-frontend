import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

// Services
import { CourseService } from '../../services/course.service';
import { AuthService } from '../../../../core/services/auth.service';

// Models
import { CourseResponse, TopSellingCoursesResponse, CourseCategory } from '../../models/course.models';

// Components
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertDialogComponent } from '../../../../shared/components/alert-dialog/alert-dialog.component';

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
  styleUrl: './course-list.component.css'
})
export class CourseListComponent implements OnInit, OnDestroy {
  // Ana değişkenler
  topSellingCourses: CourseResponse[] = [];
  allCourses: CourseResponse[] = [];
  isLoading: boolean = true;
  errorMessage: string | null = null;
  showNoDataMessage: boolean = false;

  // Kullanıcı durumu
  isLoggedIn: boolean = false;
  userHasPurchases: boolean = false;
  personalizedCategory: CourseCategory | null = null;

  // Component lifecycle management
  private destroy$ = new Subject<void>();

  // Harici platform URL'i - environment'tan alınabilir
  readonly EXTERNAL_PURCHASE_URL = 'https://egitimmerkezi.com'; // TODO: environment.externalPurchaseUrl

  constructor(
      private courseService: CourseService,
      private authService: AuthService,
      private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.checkUserStatus();
    this.loadTopSellingCourses();
    this.loadAllCourses();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Kullanıcı durumunu kontrol eder
   */
  private checkUserStatus(): void {
    this.authService.getCurrentUser()
        .pipe(takeUntil(this.destroy$))
        .subscribe(user => {
          this.isLoggedIn = !!user;
        });
  }

  /**
   * En çok satan kursları yükler (kişiselleştirilmiş veya genel)
   */
  loadTopSellingCourses(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.showNoDataMessage = false;

    this.courseService.getTopSellingCourses(5, this.isLoggedIn)
        .pipe(
            takeUntil(this.destroy$),
            catchError(error => {
              console.error('En çok satan kurslar yüklenirken hata:', error);
              // Hata durumunda genel kursları göstermeyi dene
              if (this.isLoggedIn) {
                return this.courseService.getTopSellingCourses(5, false).pipe(
                    catchError((innerError) => { // İç hata yakalama
                      console.error('Genel en çok satan kurslar yüklenirken hata:', innerError);
                      this.showNoDataMessage = true;
                      // Hata durumunda boş bir yanıt dön
                      return of({ isPersonalized: false, courses: [], totalCount: 0, category: undefined } as TopSellingCoursesResponse);
                    })
                );
              }
              this.showNoDataMessage = true;
              // Hata durumunda boş bir yanıt dön
              return of({ isPersonalized: false, courses: [], totalCount: 0, category: undefined } as TopSellingCoursesResponse);
            }),
            finalize(() => {
              this.isLoading = false;
            })
        )
        .subscribe(response => {
          // BURADAKİ KONTROL EKLENDİ
          if (response && response.courses) { // response ve response.courses'ın varlığını kontrol et
            if (response.courses.length > 0) {
              this.topSellingCourses = response.courses;
              this.personalizedCategory = response.category || null;
              this.userHasPurchases = response.isPersonalized;
            } else {
              this.showNoDataMessage = true;
            }
          } else {
            // Eğer response veya response.courses undefined/null ise buraya düşer
            this.showNoDataMessage = true;
            this.topSellingCourses = []; // topSellingCourses'ı boş bir dizi olarak ayarla
          }
        });
  }

  /**
   * Tüm yayınlanmış kursları yükler
   */
  loadAllCourses(): void {
    this.courseService.getAllPublishedCourses()
        .pipe(
            takeUntil(this.destroy$),
            catchError(error => {
              console.error('Tüm kurslar yüklenirken hata:', error);
              this.errorMessage = this.translate.instant('COURSE_LOAD_ERROR');
              return of([]);
            })
        )
        .subscribe(courses => {
          // BURADAKİ KONTROL EKLENDİ
          if (courses) { // courses'ın varlığını kontrol et
            this.allCourses = courses;
          } else {
            this.allCourses = []; // allCourses'ı boş bir dizi olarak ayarla
          }
        });
  }

  /**
   * Harici satın alma platformuna yönlendirir
   */
  goToExternalPurchaseSite(): void {
    window.open(this.EXTERNAL_PURCHASE_URL, '_blank');
  }

  /**
   * Kategori adını çevirir
   */
  getCategoryTranslation(category: CourseCategory): string {
    return this.translate.instant(`CATEGORY.${category}`);
  }

  /**
   * Seviye adını çevirir
   */
  getLevelTranslation(level: string): string {
    return this.translate.instant(`LEVEL.${level}`);
  }

  /**
   * Para birimini formatlar
   */
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

  /**
   * Kurs süresini formatlar
   */
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

  /**
   * Yıldız derecelendirmesini oluşturur
   */
  getStarArray(rating: number): boolean[] {
    const stars = [];
    const fullStars = Math.floor(rating);

    for (let i = 0; i < 5; i++) {
      stars.push(i < fullStars);
    }

    return stars;
  }

  /**
   * Alert dialog kapatıldığında mesajları temizler
   */
  clearMessages(): void {
    this.errorMessage = null;
  }

  /**
   * Sayfayı yeniler
   */
  refreshPage(): void {
    this.loadTopSellingCourses();
    this.loadAllCourses();
  }

  /**
   * Kursa tıklandığında
   */
  onCourseClick(courseId: number): void {
    // Analytics veya diğer işlemler için
    console.log('Kursa tıklandı:', courseId);
  }
}