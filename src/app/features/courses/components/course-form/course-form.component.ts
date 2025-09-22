// course-form.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CourseService } from '../../services/course.service';
// CourseCategory ve CourseLevel enumlarını import ediyoruz
import { CourseDetailsResponse, CourseCategory, CourseLevel } from '../../models/course.models';
import { catchError, finalize } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertDialogComponent } from '../../../../shared/components/alert-dialog/alert-dialog.component';
import { TokenService } from '../../../../core/services/token.service';

@Component({
  selector: 'app-course-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TranslateModule,
    LoadingSpinnerComponent,
    AlertDialogComponent
  ],
  templateUrl: './course-form.component.html',
  styleUrl: './course-form.component.css'
})
export class CourseFormComponent implements OnInit {
  courseForm!: FormGroup;
  courseId: number | null = null;
  isEditMode: boolean = false;
  isLoading: boolean = true;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  currentUserId: number | null = null;

  // Material upload URL'i
  readonly MATERIAL_UPLOAD_URL = 'http://localhost:4200/instructor/add-material';
  // Cloudflare base URL
  readonly CLOUDFLARE_BASE_URL = 'https://media-videos.849d26839fb7b1d41361dfa0cfed6323.r2.cloudflarestorage.com/';

  // Enum değerlerini şablonda kullanmak için
  courseCategories = Object.values(CourseCategory);
  courseLevels = Object.values(CourseLevel);

  // Dil seçenekleri
  languageOptions = [
    { value: 'TR', labelKey: 'LANGUAGE.TR' },
    { value: 'EN', labelKey: 'LANGUAGE.EN' },
    { value: 'UK', labelKey: 'LANGUAGE.UK' },
    // Diğer diller eklenebilir
  ];

  constructor(
      private route: ActivatedRoute,
      private router: Router,
      private courseService: CourseService,
      private translate: TranslateService,
      private tokenService: TokenService
  ) { }

  ngOnInit(): void {
    this.currentUserId = this.tokenService.getUser()?.id || null;

    this.route.paramMap.subscribe(params => {
      const id = params.get('courseId');
      if (id) {
        this.courseId = +id;
        this.isEditMode = true;
      } else {
        this.isEditMode = false;
      }
      this.initForm();
      if (this.isEditMode && this.courseId) {
        this.loadCourseDetails(this.courseId);
      } else {
        this.isLoading = false;
      }
    });
  }

  /**
   * Eğitim formunu başlatır.
   * externalPurchaseUrl ve certificateAvailable alanları kaldırıldı.
   * imageUrl validasyonu güncellendi - artık URL formatı kontrolü yok
   */
  initForm(): void {
    this.courseForm = new FormGroup({
      title: new FormControl('', [Validators.required, Validators.minLength(3)]),
      description: new FormControl('', [Validators.required, Validators.minLength(10)]),
      imageUrl: new FormControl('', [Validators.required]), // URL pattern validasyonu kaldırıldı
      price: new FormControl(0, [Validators.required, Validators.min(0)]),
      published: new FormControl(false), // Varsayılan olarak false, admin onayı gerekecek
      category: new FormControl(null, [Validators.required]),
      duration: new FormControl(0, [Validators.required, Validators.min(0)]),
      level: new FormControl(null, [Validators.required]),
      language: new FormControl(null, [Validators.required]),
      requirements: new FormControl(''),
      whatYouWillLearn: new FormControl(''),
      targetAudience: new FormControl('')
    });
  }

  // Form kontrollerine kolay erişim için getter'lar
  get title() { return this.courseForm.get('title'); }
  get description() { return this.courseForm.get('description'); }
  get imageUrl() { return this.courseForm.get('imageUrl'); }
  get price() { return this.courseForm.get('price'); }
  get published() { return this.courseForm.get('published'); }
  get category() { return this.courseForm.get('category'); }
  get duration() { return this.courseForm.get('duration'); }
  get level() { return this.courseForm.get('level'); }
  get language() { return this.courseForm.get('language'); }
  get requirements() { return this.courseForm.get('requirements'); }
  get whatYouWillLearn() { return this.courseForm.get('whatYouWillLearn'); }
  get targetAudience() { return this.courseForm.get('targetAudience'); }

  /**
   * Görsel URL'ini Cloudflare URL'ine dönüştürür
   */
  getImagePreviewUrl(fileName: string): string {
    if (!fileName) return '';

    // Eğer zaten tam URL ise direkt döndür
    if (fileName.startsWith('http://') || fileName.startsWith('https://')) {
      return fileName;
    }

    // Dosya adını URL encode et (boşlukları %20'ye çevir)
    const encodedFileName = encodeURIComponent(fileName);

    // Cloudflare URL'ini oluştur
    return `${this.CLOUDFLARE_BASE_URL}${encodedFileName}`;
  }

  /**
   * Material upload sayfasını yeni sekmede açar
   */
  openMaterialUpload(): void {
    window.open(this.MATERIAL_UPLOAD_URL, '_blank');
  }

  /**
   * Düzenleme modundaysa eğitimin detaylarını yükler ve formu doldurur.
   * externalPurchaseUrl ve certificateAvailable alanları kaldırıldı
   */
  loadCourseDetails(id: number): void {
    this.isLoading = true;
    this.errorMessage = null;

    if (!this.currentUserId) {
      this.isLoading = false;
      this.errorMessage = this.translate.instant('AUTHENTICATION_REQUIRED');
      this.router.navigate(['/auth/login']);
      return;
    }

    this.courseService.getCourseDetailsById(id).pipe(
        catchError(error => {
          this.errorMessage = error.message || this.translate.instant('COURSE_LOAD_FAILED_GENERIC');
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
        })
    ).subscribe(course => {
      if (course) {
        this.courseForm.patchValue({
          title: course.title,
          description: course.description,
          imageUrl: course.imageUrl,
          price: course.price,
          published: course.published,
          category: course.category,
          duration: course.duration,
          level: course.level,
          language: course.language,
          requirements: course.requirements ? course.requirements.join('\n') : '',
          whatYouWillLearn: course.whatYouWillLearn ? course.whatYouWillLearn.join('\n') : '',
          targetAudience: course.targetAudience ? course.targetAudience.join('\n') : ''
        });
      } else {
        this.errorMessage = this.translate.instant('COURSE_NOT_LOADED');
      }
    });
  }

  /**
   * String'i satırlara bölerek array'e dönüştürür
   * Boş satırları filtreler
   */
  private parseTextAreaToArray(text: string): string[] {
    if (!text) return [];
    return text.split('\n')
        .map(item => item.trim())
        .filter(item => item !== '');
  }

  /**
   * Eğitim formunu gönderir.
   * Admin onayı için published alanı false olarak ayarlanır (yeni eğitim için)
   * externalPurchaseUrl ve certificateAvailable alanları kaldırıldı
   */
  onSubmit(): void {
    this.errorMessage = null;
    this.successMessage = null;

    if (this.courseForm.invalid) {
      this.errorMessage = this.translate.instant('INVALID_FORM_DATA');
      this.courseForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    const rawCourseData = this.courseForm.value;

    // Form verilerini backend formatına dönüştür
    const courseData: Partial<CourseDetailsResponse> = {
      title: rawCourseData.title,
      description: rawCourseData.description,
      imageUrl: rawCourseData.imageUrl,
      price: rawCourseData.price,
      published: this.isEditMode ? rawCourseData.published : false, // Yeni eğitim için her zaman false
      category: rawCourseData.category,
      duration: rawCourseData.duration,
      level: rawCourseData.level,
      language: rawCourseData.language,
      requirements: this.parseTextAreaToArray(rawCourseData.requirements),
      whatYouWillLearn: this.parseTextAreaToArray(rawCourseData.whatYouWillLearn),
      targetAudience: this.parseTextAreaToArray(rawCourseData.targetAudience),
      // Backend tarafından doldurulacak alanlar
      instructorName: '',
      lessons: [],
      reviews: [],
      enrollmentCount: 0,
      averageRating: 0,
      totalReviews: 0,
      certificateAvailable: false, // Varsayılan olarak false
      createdAt: new Date().toISOString(),
      updatedAt: null
    };

    let operation: Observable<any>;
    let successMessageKey: string;

    if (this.isEditMode && this.courseId) {
      operation = this.courseService.updateCourse(this.courseId, courseData as CourseDetailsResponse);
      successMessageKey = 'COURSE_UPDATE_SUCCESS';
    } else {
      operation = this.courseService.createCourse(courseData as CourseDetailsResponse);
      successMessageKey = 'COURSE_CREATE_SUCCESS_ADMIN_APPROVAL';
    }

    operation.pipe(
        catchError(error => {
          this.errorMessage = error.message || this.translate.instant('COURSE_SAVE_FAILED_GENERIC');
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
        })
    ).subscribe(response => {
      if (response) {
        this.successMessage = this.translate.instant(successMessageKey);

        // Eğer yeni eğitim oluşturulduysa, admin onayı bekleniyor mesajını göster
        if (!this.isEditMode) {
          this.successMessage += ' ' + this.translate.instant('ADMIN_APPROVAL_PENDING');
        }

        // 2 saniye bekle sonra yönlendir
        setTimeout(() => {
          this.router.navigate(['/courses', response.id]);
        }, 2000);
      }
    });
  }

  /**
   * Form'da yapılmamış değişiklikler var mı kontrol eder
   */
  hasUnsavedChanges(): boolean {
    return this.courseForm?.dirty || false;
  }

  /**
   * Alert dialog kapatıldığında mesajları temizler
   */
  clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
  }
}