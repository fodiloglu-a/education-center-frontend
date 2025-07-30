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
import {Observable, of} from 'rxjs';
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

  // Enum değerlerini şablonda kullanmak için
  courseCategories = Object.values(CourseCategory);
  courseLevels = Object.values(CourseLevel);

  // Dil seçenekleri (basit bir örnek)
  // Gerçek projede bu bir servisten veya dış kaynaktan gelmelidir.
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
      this.initForm(); // Formu burada başlat
      if (this.isEditMode && this.courseId) {
        this.loadCourseDetails(this.courseId); // Düzenleme modundaysa detayları yükle
      } else {
        this.isLoading = false; // Yeni kurs oluşturuluyorsa yükleme bitti
      }
    });
  }

  /**
   * Eğitim formunu başlatır.
   * Yeni eklenen alanlar için FormControl'ler eklendi.
   */
  initForm(): void {
    this.courseForm = new FormGroup({
      title: new FormControl('', [Validators.required, Validators.minLength(3)]),
      description: new FormControl('', [Validators.required, Validators.minLength(10)]),
      imageUrl: new FormControl('', [Validators.required, Validators.pattern('^(https?:\/\/[^\\s\/$.?#].[^\\s]*)$')]),
      price: new FormControl(0, [Validators.required, Validators.min(0)]),
      published: new FormControl(false),
      // YENİ EKLENEN FORM KONTROLLERİ
      category: new FormControl(null, [Validators.required]), // Enum için başlangıçta null veya varsayılan bir değer
      duration: new FormControl(0, [Validators.required, Validators.min(0)]),
      level: new FormControl(null, [Validators.required]), // Enum için başlangıçta null veya varsayılan bir değer
      language: new FormControl(null, [Validators.required]), // Dil seçimi
      externalPurchaseUrl: new FormControl(''), // Opsiyonel olduğu için required değil
      requirements: new FormControl(''), // Textarea'dan diziye dönüştürülecek
      whatYouWillLearn: new FormControl(''), // Textarea'dan diziye dönüştürülecek
      targetAudience: new FormControl(''), // Textarea'dan diziye dönüştürülecek
      certificateAvailable: new FormControl(false)
    });
  }

  // Form kontrollerine kolay erişim için getter'lar
  get title() { return this.courseForm.get('title'); }
  get description() { return this.courseForm.get('description'); }
  get imageUrl() { return this.courseForm.get('imageUrl'); }
  get price() { return this.courseForm.get('price'); }
  get published() { return this.courseForm.get('published'); }
  // YENİ EKLENEN GETTER'LAR
  get category() { return this.courseForm.get('category'); }
  get duration() { return this.courseForm.get('duration'); }
  get level() { return this.courseForm.get('level'); }
  get language() { return this.courseForm.get('language'); }
  get externalPurchaseUrl() { return this.courseForm.get('externalPurchaseUrl'); }
  get requirements() { return this.courseForm.get('requirements'); }
  get whatYouWillLearn() { return this.courseForm.get('whatYouWillLearn'); }
  get targetAudience() { return this.courseForm.get('targetAudience'); }
  get certificateAvailable() { return this.courseForm.get('certificateAvailable'); }


  /**
   * Düzenleme modundaysa eğitimin detaylarını yükler ve formu doldurur.
   * Yeni eklenen alanlar için patchValue eklendi.
   * @param id Eğitimin ID'si.
   */
  loadCourseDetails(id: number): void {
    this.isLoading = true;
    this.errorMessage = null;

    if (!this.currentUserId) {
      this.isLoading = false;
      this.errorMessage = this.translate.instant('AUTHENTICATION_REQUIRED');
      this.router.navigate(['/auth/login']); // Kullanıcı yoksa giriş sayfasına yönlendir
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
          // YENİ EKLENEN ALANLARIN PATCH EDİLMESİ
          category: course.category,
          duration: course.duration,
          level: course.level,
          language: course.language,
          externalPurchaseUrl: course.externalPurchaseUrl || '', // null ise boş string
          requirements: course.requirements ? course.requirements.join('\n') : '', // Diziyi textarea için stringe çevir
          whatYouWillLearn: course.whatYouWillLearn ? course.whatYouWillLearn.join('\n') : '',
          targetAudience: course.targetAudience ? course.targetAudience.join('\n') : '',
          certificateAvailable: course.certificateAvailable
        });
      } else {
        this.errorMessage = this.translate.instant('COURSE_NOT_LOADED');
      }
    });
  }

  /**
   * Eğitim formunu gönderir.
   * Yeni eğitim oluşturur veya mevcut eğitimi günceller.
   * Yeni eklenen alanların dönüşümü yapıldı.
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

    // String dizisi alanlarını newline karakterine göre böl
    const courseData: CourseDetailsResponse = {
      ...rawCourseData,
      requirements: rawCourseData.requirements ? rawCourseData.requirements.split('\n').filter((item: string) => item.trim() !== '') : [],
      whatYouWillLearn: rawCourseData.whatYouWillLearn ? rawCourseData.whatYouWillLearn.split('\n').filter((item: string) => item.trim() !== '') : [],
      targetAudience: rawCourseData.targetAudience ? rawCourseData.targetAudience.split('\n').filter((item: string) => item.trim() !== '') : [],
      // Diğer eksik alanları CourseDetailsResponse tipine uygun şekilde doldur
      // Bu alanlar genellikle entity'de bulunmayan, ancak DTO'da beklenen türetilmiş veya ilişkisel verilerdir.
      // Backend'e gönderirken bunları boş veya varsayılan değerlerle göndermek genellikle kabul edilebilir.
      instructorName: '', // Frontend'de formdan gelmiyor, backend instructorId'den alacak
      lessons: [],
      reviews: [],
      enrollmentCount: 0,
      averageRating: 0,
      totalReviews: 0,
      createdAt: new Date().toISOString(),
      updatedAt: null // Güncelleme modunda backend tarafından set edilecek
    };

    let operation: Observable<any>;
    if (this.isEditMode && this.courseId) {
      operation = this.courseService.updateCourse(this.courseId, courseData);
    } else {
      operation = this.courseService.createCourse(courseData);
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
        this.successMessage = this.translate.instant('COURSE_SAVE_SUCCESS');
        this.router.navigate(['/courses', response.id]);
      }
    });
  }

  /**
   * Alert dialog kapatıldığında mesajları temizler.
   */
  clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
  }
}