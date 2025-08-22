import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CourseService } from '../../services/course.service';
import { CourseDetailsResponse, LessonDTO } from '../../models/course.models';
import { catchError, finalize } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertDialogComponent } from '../../../../shared/components/alert-dialog/alert-dialog.component';
import { TokenService } from '../../../../core/services/token.service';

@Component({
  selector: 'app-lesson-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TranslateModule,
    LoadingSpinnerComponent,
    AlertDialogComponent
  ],
  templateUrl: './lesson-form.component.html',
  styleUrl: './lesson-form.component.css'
})
export class LessonFormComponent implements OnInit {
  lessonForm!: FormGroup;
  courseId: number | null = null;
  lessonId: number | null = null;
  isEditMode: boolean = false;
  isLoading = true;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  currentUserId: number | null = null;
  courseTitle = '';

  constructor(
      private route: ActivatedRoute,
      private router: Router,
      private courseService: CourseService,
      private translate: TranslateService,
      private tokenService: TokenService
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.tokenService.getUser()?.id || null;
    if (!this.currentUserId) {
      this.errorMessage = this.translate.instant('AUTHENTICATION_REQUIRED');
      this.isLoading = false;
      return;
    }

    this.route.paramMap.subscribe(params => {
      const cId = params.get('courseId');
      const lId = params.get('lessonId');
      const parsedLessonId = lId ? parseInt(lId, 10) : NaN;

      if (cId) {
        this.courseId = +cId;
        this.loadCourseDetailsForTitle(this.courseId);
        this.initForm(); // Formu burada başlat

        if (lId && !isNaN(parsedLessonId)) {
          this.lessonId = parsedLessonId;
          this.isEditMode = true;
          this.loadLessonDetails(this.courseId, this.lessonId);
        } else {
          this.isEditMode = false;
          this.isLoading = false; // Yeni ders oluşturuluyorsa yükleme bitti
        }
      } else {
        this.errorMessage = this.translate.instant('COURSE_ID_NOT_FOUND_FOR_LESSON');
        this.isLoading = false;
      }
    });
  }

  /**
   * Ders formunu başlatır.
   * Yeni eklenen alanlar için FormControl'ler eklendi.
   */
  initForm(): void {
    this.lessonForm = new FormGroup({
      title: new FormControl('', [Validators.required, Validators.minLength(3)]),
      description: new FormControl('', [Validators.required, Validators.minLength(10)]),
      videoUrl: new FormControl(''), // ✅ Validation kaldırıldı
      lessonOrder: new FormControl(1, [Validators.required, Validators.min(1)]),
      duration: new FormControl(0, [Validators.required, Validators.min(0)]),
      isPreview: new FormControl(false),
      resources: new FormControl('')
    });
  }

  // Form kontrollerine kolay erişim için getter'lar
  get title() { return this.lessonForm.get('title'); }
  get description() { return this.lessonForm.get('description'); }
  get videoUrl() { return this.lessonForm.get('videoUrl'); }
  get lessonOrder() { return this.lessonForm.get('lessonOrder'); }
  // YENİ EKLENEN GETTER'LAR
  get duration() { return this.lessonForm.get('duration'); }
  get isPreview() { return this.lessonForm.get('isPreview'); }
  get resources() { return this.lessonForm.get('resources'); }


  loadCourseDetailsForTitle(courseId: number): void {
    this.courseService.getCourseDetailsById(courseId).pipe(
        catchError(error => {
          this.errorMessage = error.message || this.translate.instant('COURSE_LOAD_FAILED_GENERIC');
          return of(null);
        })
    ).subscribe(course => {
      if (course) {
        this.courseTitle = course.title;
      } else {
        this.errorMessage = this.translate.instant('COURSE_NOT_LOADED_FOR_LESSON');
      }
    });
  }

  /**
   * Düzenleme modundaysa dersin detaylarını yükler ve formu doldurur.
   * Yeni eklenen alanlar için patchValue eklendi.
   */
  loadLessonDetails(courseId: number, lessonId: number): void {
    this.isLoading = true;
    this.courseService.getCourseDetailsById(courseId).pipe( // Ders detayını almak için kurs detaylarını çekiyoruz
        catchError(error => {
          this.errorMessage = error.message || this.translate.instant('LESSON_LOAD_FAILED_GENERIC');
          return of(null);
        }),
        finalize(() => this.isLoading = false)
    ).subscribe(course => {
      if (course?.lessons?.length) {
        const lesson = course.lessons.find(l => l.id === lessonId);
        if (lesson) {
          this.lessonForm.patchValue({
            title: lesson.title,
            description: lesson.description,
            videoUrl: lesson.videoUrl,
            lessonOrder: lesson.lessonOrder,
            // YENİ EKLENEN ALANLARIN PATCH EDİLMESİ
            duration: lesson.duration,
            isPreview: lesson.preview,
            resources: lesson.resources ? lesson.resources.join('\n') : '' // Diziyi textarea için stringe çevir
          });
        } else {
          this.errorMessage = this.translate.instant('LESSON_NOT_FOUND');
        }
      } else {
        this.errorMessage = this.translate.instant('NO_LESSONS_IN_COURSE');
      }
    });
  }

  /**
   * Ders formunu gönderir.
   * Yeni ders oluşturur veya mevcut dersi günceller.
   * Yeni eklenen alanların dönüşümü yapıldı.
   */
  onSubmit(): void {
    this.errorMessage = null;
    this.successMessage = null;

    if (this.lessonForm.invalid) {
      this.errorMessage = this.translate.instant('INVALID_FORM_DATA');
      this.lessonForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const rawLessonData = this.lessonForm.value;

    // String dizisi alanını newline karakterine göre böl
    const lessonData: LessonDTO = {
      ...rawLessonData,
      resources: rawLessonData.resources ? rawLessonData.resources.split('\n').filter((item: string) => item.trim() !== '') : []
    };

    let operation: Observable<any>;
    if (this.isEditMode && this.courseId && this.lessonId) {
      operation = this.courseService.updateLessonInCourse(this.courseId, this.lessonId, lessonData);
    } else if (this.courseId) {
      operation = this.courseService.addLessonToCourse(this.courseId, lessonData);
    } else {
      this.errorMessage = this.translate.instant('COURSE_ID_MISSING_FOR_LESSON_SAVE');
      this.isLoading = false;
      return;
    }

    operation.pipe(
        catchError(error => {
          this.errorMessage = error.message || this.translate.instant('LESSON_SAVE_FAILED_GENERIC');
          return of(null);
        }),
        finalize(() => this.isLoading = false)
    ).subscribe(response => {
      if (response) {
        this.successMessage = this.translate.instant('LESSON_SAVE_SUCCESS');
        this.router.navigate(['/courses', this.courseId]);
      }
    });
  }

  clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
  }
}