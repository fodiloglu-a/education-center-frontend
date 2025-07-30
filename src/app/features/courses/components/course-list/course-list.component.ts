import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, interval, Subscription } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

// Services
import { CourseService } from '../../services/course.service';
import { AuthService } from '../../../../core/services/auth.service';
import { TokenService } from '../../../../core/services/token.service';

// Models
import { CourseResponse, CourseCategory } from '../../models/course.models';

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
  topSellingCourses: CourseResponse[] = []; // Reklam/öneri alanı
  allCourses: CourseResponse[] = []; // Satın Alınan Kurslar alanı
  isLoading: boolean = true;
  errorMessage: string | null = null;

  // Yeni eklenen: Reklam alanında CTA gösterilmesi gerekip gerekmediğini belirtir
  showCallToActionForTopSelling: boolean = false;

  // Kullanıcı durumu
  isLoggedIn: boolean = false;
  currentUserId: number | null = null;
  personalizedCategory: CourseCategory | null = null;

  // Slider properties
  currentSlide = 0;
  maxSlide = 0;
  slideWidth = 100;
  slideIndicators: number[] = [];
  autoSlideInterval?: Subscription;
  autoSlideEnabled = true;
  slidesPerView = 1;

  // Component lifecycle management
  private destroy$ = new Subject<void>();

  // Harici platform URL'i - environment'tan alınabilir
  readonly EXTERNAL_PURCHASE_URL = 'https://egitimmerkezi.com'; // TODO: environment.externalPurchaseUrl

  constructor(
      private courseService: CourseService,
      private authService: AuthService,
      private translate: TranslateService,
      private tokenService: TokenService
  ) { }

  ngOnInit(): void {
    // Window resize listener
    this.calculateResponsiveSlides();

    // Kullanıcı durumu değiştiğinde kursları yeniden yükle
    this.authService.getCurrentUser()
        .pipe(takeUntil(this.destroy$))
        .subscribe(user => {
          this.isLoggedIn = !!user;
          this.currentUserId = user ? user.id : null;
          this.loadTopSellingCourses(); // Kullanıcı durumu değiştiğinde önerileri yükle
          this.loadPurchasedCourses();       // Satın alınan kursları yükle
        });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopAutoSlide();
  }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.calculateResponsiveSlides();
    this.updateSliderDimensions();
  }

  /**
   * Reklam/öneri alanı için kursları yükler (kişiselleştirilmiş veya genel).
   * Kullanıcının satın aldığı kurslar varsa, onlara benzer kurslar önerir.
   * Hiç satın alım yoksa veya giriş yapılmamışsa, en çok satanları gösterir ve yönlendirme butonu açar.
   */
  loadTopSellingCourses(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.showCallToActionForTopSelling = false; // Her yüklemede sıfırla

    let fetchObservable: Observable<CourseResponse[]>;
    let isPersonalizedAttempt = false;

    if (this.isLoggedIn && this.currentUserId) {
      isPersonalizedAttempt = true;
      // Giriş yapmış kullanıcılar için önerilen kursları çekmeyi dene
      fetchObservable = this.courseService.getRecommendedCourses(this.currentUserId, 5).pipe(
          catchError(err => {
            console.warn('Kişiselleştirilmiş öneriler yüklenirken hata, genel en çok satanlara düşülüyor:', err);
            // Hata durumunda genel en çok satanlara fallback yap
            isPersonalizedAttempt = false; // Kişiselleştirme başarısız oldu
            return this.courseService.getTopSellingCourses(5, false, null); // personalized: false, userId: null
          })
      );
    } else {
      // Kullanıcı giriş yapmamışsa, doğrudan genel en çok satanları yükle
      fetchObservable = this.courseService.getTopSellingCourses(5, false, null); // personalized: false, userId: null
    }

    fetchObservable.pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Öneri/En çok satan kurslar yüklenirken genel hata:', error);
          this.topSellingCourses = []; // Hata durumunda boş dizi dön
          this.showCallToActionForTopSelling = true; // Yönlendirme butonunu göster
          return of([]);
        }),
        finalize(() => {
          this.isLoading = false;
        })
    ).subscribe(courses => {
      if (courses && courses.length > 0) {
        this.topSellingCourses = courses;
        this.showCallToActionForTopSelling = false; // Kursları göster, yönlendirme yok
        this.personalizedCategory = isPersonalizedAttempt && courses[0]?.category ? courses[0].category : null;

        // Slider'ı initialize et
        this.initializeSlider();
      } else {
        // Kurs bulunamadıysa (kişiselleştirilmiş veya genel) veya hata varsa
        this.topSellingCourses = [];
        this.showCallToActionForTopSelling = true; // Yönlendirme butonunu göster
        this.personalizedCategory = null;
      }
    });
  }

  /**
   * "Satın Alınan Kurslar" bölümü için kursları yükler.
   * Sadece giriş yapmış kullanıcının satın aldığı kursları gösterir.
   * Giriş yapmamışsa veya satın almamışsa boş liste gösterir.
   */
  loadPurchasedCourses(): void { // loadAllCourses yerine loadPurchasedCourses olarak isim değişti
    this.isLoading = true;
    this.errorMessage = null;
    console.log('isLoggedIn',this.isLoggedIn, 'currentUserId' ,this.currentUserId)
    if (this.isLoggedIn && this.currentUserId) {
      // Giriş yapmış kullanıcılar için satın alınan kursları çek
      this.courseService.getPurchasedCoursesByUserId(this.currentUserId)
          .pipe(
              takeUntil(this.destroy$),
              catchError(error => {
                console.error('Satın alınan kurslar yüklenirken hata:', error);
                this.errorMessage = this.translate.instant('COURSE_LOAD_ERROR');
                return of([]); // Hata durumunda boş dizi dön
              }),
              finalize(() => {
                this.isLoading = false;
              })
          )
          .subscribe(courses => {
            if (courses) {
              this.allCourses = courses; // `allCourses` değişkeni satın alınan kursları tutacak
            } else {
              this.allCourses = [];
            }
          });
    } else {
      // Kullanıcı giriş yapmamışsa, satın alınan kurslar boş olacak
      this.allCourses = [];
      this.isLoading = false; // Yükleme bitti
    }
  }

  // ========== SLIDER METHODS ==========

  /**
   * Slider'ı initialize eder
   */
  private initializeSlider(): void {
    if (this.topSellingCourses.length === 0) return;

    this.calculateResponsiveSlides();
    this.updateSliderDimensions();
    this.createSlideIndicators();
    this.startAutoSlide();
  }

  /**
   * Ekran boyutuna göre gösterilecek slide sayısını hesaplar
   */
  private calculateResponsiveSlides(): void {
    const screenWidth = window.innerWidth;

    if (screenWidth < 481) {
      this.slidesPerView = 1;
    } else if (screenWidth < 768) {
      this.slidesPerView = 1;
    } else if (screenWidth < 1024) {
      this.slidesPerView = 2;
    } else {
      this.slidesPerView = 3;
    }
  }

  /**
   * Slider boyutlarını günceller
   */
  private updateSliderDimensions(): void {
    if (this.topSellingCourses.length === 0) return;

    this.slideWidth = 100 / this.slidesPerView;
    this.maxSlide = Math.max(0, Math.ceil(this.topSellingCourses.length / this.slidesPerView) - 1);

    // Mevcut slide'ı sınırlar içinde tut
    if (this.currentSlide > this.maxSlide) {
      this.currentSlide = this.maxSlide;
    }
  }

  /**
   * Slide indicator'larını oluşturur
   */
  private createSlideIndicators(): void {
    const totalSlides = Math.ceil(this.topSellingCourses.length / this.slidesPerView);
    this.slideIndicators = Array.from({ length: totalSlides }, (_, i) => i);
  }

  /**
   * Otomatik slide'ı başlatır
   */
  private startAutoSlide(): void {
    if (!this.autoSlideEnabled || this.topSellingCourses.length <= this.slidesPerView) return;

    this.stopAutoSlide(); // Önceki interval'ı temizle

    this.autoSlideInterval = interval(4000) // 4 saniyede bir değiş
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.nextSlide();
        });
  }

  /**
   * Otomatik slide'ı durdurur
   */
  private stopAutoSlide(): void {
    if (this.autoSlideInterval) {
      this.autoSlideInterval.unsubscribe();
      this.autoSlideInterval = undefined;
    }
  }

  /**
   * Sonraki slide'a geçer
   */
  nextSlide(): void {
    if (this.currentSlide < this.maxSlide) {
      this.currentSlide++;
    } else {
      this.currentSlide = 0; // Başa dön
    }
    this.restartAutoSlide();
  }

  /**
   * Önceki slide'a geçer
   */
  previousSlide(): void {
    if (this.currentSlide > 0) {
      this.currentSlide--;
    } else {
      this.currentSlide = this.maxSlide; // Sona git
    }
    this.restartAutoSlide();
  }

  /**
   * Belirtilen slide'a gider
   */
  goToSlide(slideIndex: number): void {
    this.currentSlide = Math.min(slideIndex, this.maxSlide);
    this.restartAutoSlide();
  }

  /**
   * Otomatik slide'ı yeniden başlatır
   */
  private restartAutoSlide(): void {
    if (this.autoSlideEnabled) {
      this.stopAutoSlide();
      setTimeout(() => this.startAutoSlide(), 1000); // 1 saniye bekle sonra otomatik slide'ı başlat
    }
  }

  /**
   * Slider mouse enter event
   */
  onSliderMouseEnter(): void {
    this.stopAutoSlide();
  }

  /**
   * Slider mouse leave event
   */
  onSliderMouseLeave(): void {
    if (this.autoSlideEnabled) {
      this.startAutoSlide();
    }
  }

  // ========== UTILITY METHODS ==========

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
    this.loadPurchasedCourses();
  }

  /**
   * Kursa tıklandığında
   */
  onCourseClick(courseId: number): void {
    console.log('Kursa tıklandı:', courseId);
  }
}