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
  styleUrls: ['./lesson-form.component.css']
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

  // Video seçimi için yeni özellikler
  selectedVideoId: string | null = null;
  selectedVideoTitle: string | null = null;

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
        this.initForm();

        if (lId && !isNaN(parsedLessonId)) {
          this.lessonId = parsedLessonId;
          this.isEditMode = true;
          this.loadLessonDetails(this.courseId, this.lessonId);
        } else {
          this.isEditMode = false;
          this.isLoading = false;
        }
      } else {
        this.errorMessage = this.translate.instant('COURSE_ID_NOT_FOUND_FOR_LESSON');
        this.isLoading = false;
      }
    });
  }

  /**
   * Form kontrollerini başlatır
   * Video URL yerine video ID validation'ı eklendi
   */
  initForm(): void {
    this.lessonForm = new FormGroup({
      title: new FormControl('', [Validators.required, Validators.minLength(3)]),
      description: new FormControl('', [Validators.required, Validators.minLength(10)]),
      videoId: new FormControl('', [this.videoIdValidator.bind(this)]), // Video URL yerine video ID
      lessonOrder: new FormControl(1, [Validators.required, Validators.min(1)]),
      duration: new FormControl(0, [Validators.required, Validators.min(0)]),
      isPreview: new FormControl(false),
      resources: new FormControl('')
    });
  }

  /**
   * Cloudflare video ID için özel validator
   * Format: UUID_filename.mp4
   */
  private videoIdValidator(control: any): {[key: string]: any} | null {
    if (!control.value) {
      return null; // Boş değer için hata döndürme (required validator ayrı kontrol eder)
    }

    const videoId = control.value;

    // Temel format kontrolü: UUID_filename pattern'i
    const videoIdPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}_.*\.(mp4|avi|mov|mkv|webm)$/i;

    if (!videoIdPattern.test(videoId)) {
      return { 'invalidVideoId': { value: control.value } };
    }

    return null;
  }

  // Form kontrollerine kolay erişim için getter'lar
  get title() { return this.lessonForm.get('title'); }
  get description() { return this.lessonForm.get('description'); }
  get videoId() { return this.lessonForm.get('videoId'); } // videoUrl yerine videoId
  get lessonOrder() { return this.lessonForm.get('lessonOrder'); }
  get duration() { return this.lessonForm.get('duration'); }
  get isPreview() { return this.lessonForm.get('isPreview'); }
  get resources() { return this.lessonForm.get('resources'); }

  /**
   * Video seçim sayfasını yeni sekmede açar
   * Kullanıcı oradan video ID'sini kopyalayıp bu sayfaya yapıştıracak
   */
  openVideoSelector(): void {
    // Materyal sayfasını yeni sekmede aç
    const materialUrl = `${window.location.origin}/instructor/add-material`;
    window.open(materialUrl, '_blank');

    // Kullanıcıya bilgi mesajı göster
    this.successMessage = this.translate.instant('MATERIAL_PAGE_OPENED_COPY_VIDEO_ID');

    // Video ID input'una focus ver (kullanıcı yapıştırma yapabilsin)
    setTimeout(() => {
      const videoIdInput = document.getElementById('videoId') as HTMLInputElement;
      if (videoIdInput) {
        videoIdInput.focus();
      }
    }, 500);
  }

  /**
   * Video ID'si yapıştırıldığında çalışır
   * Form validation'ı otomatik olarak çalışacak
   */
  onVideoIdPaste(event: ClipboardEvent): void {
    // Paste event'ini yakala
    const pastedText = event.clipboardData?.getData('text') || '';

    if (pastedText) {
      // Video ID'sini form'a set et
      this.lessonForm.patchValue({
        videoId: pastedText.trim()
      });

      // Video ID'sinden başlığı çıkar
      this.selectedVideoId = pastedText.trim();
      this.selectedVideoTitle = this.getVideoTitleFromId(this.selectedVideoId);

      // Validation'ı tetikle
      this.videoId?.markAsTouched();
      this.videoId?.updateValueAndValidity();

      // Başarı mesajı göster
      if (this.videoId?.valid) {
        this.successMessage = this.translate.instant('VIDEO_ID_PASTED_SUCCESSFULLY');
      }
    }
  }

  /**
   * Video ID input'undaki değişiklikleri handle eder
   */
  onVideoIdChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const videoId = target.value.trim();

    if (videoId) {
      this.selectedVideoId = videoId;
      this.selectedVideoTitle = this.getVideoTitleFromId(videoId);

      // Validation sonucuna göre mesaj göster
      this.videoId?.updateValueAndValidity();

      if (this.videoId?.valid) {
        this.successMessage = this.translate.instant('VALID_VIDEO_ID_ENTERED');
        this.errorMessage = null;
      } else if (this.videoId?.errors?.['invalidVideoId']) {
        this.errorMessage = this.translate.instant('INVALID_VIDEO_ID_FORMAT');
        this.successMessage = null;
      }
    } else {
      this.selectedVideoId = null;
      this.selectedVideoTitle = null;
      this.clearMessages();
    }
  }

  /**
   * Form verilerini session storage'a kaydeder
   */
  private saveFormDataToSession(): void {
    if (this.lessonForm.value) {
      const formData = {
        ...this.lessonForm.value,
        selectedVideoId: this.selectedVideoId,
        selectedVideoTitle: this.selectedVideoTitle
      };
      sessionStorage.setItem('lesson-form-data', JSON.stringify(formData));
    }
  }

  /**
   * Session storage'dan form verilerini geri yükler
   */
  private restoreFormDataFromSession(): void {
    const savedData = sessionStorage.getItem('lesson-form-data');
    if (savedData) {
      try {
        const formData = JSON.parse(savedData);

        // Video bilgilerini ayır
        const { selectedVideoId, selectedVideoTitle, ...formValues } = formData;

        // Form verilerini geri yükle (video ID hariç, o zaten set edildi)
        this.lessonForm.patchValue({
          ...formValues,
          videoId: this.selectedVideoId // Yeni seçilen video ID'sini kullan
        });

        // Session'ı temizle
        sessionStorage.removeItem('lesson-form-data');
      } catch (error) {
        console.warn('Session storage\'dan form verileri geri yüklenemedi:', error);
      }
    }
  }

  /**
   * Seçili videoyu temizler
   */
  clearSelectedVideo(): void {
    this.selectedVideoId = null;
    this.selectedVideoTitle = null;
    this.lessonForm.patchValue({
      videoId: ''
    });

    this.successMessage = this.translate.instant('VIDEO_SELECTION_CLEARED');
  }



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
   * Düzenleme modunda ders detaylarını yükler
   * Video URL yerine video ID field'ını kullanır
   */
  loadLessonDetails(courseId: number, lessonId: number): void {
    this.isLoading = true;
    this.courseService.getCourseDetailsById(courseId).pipe(
        catchError(error => {
          this.errorMessage = error.message || this.translate.instant('LESSON_LOAD_FAILED_GENERIC');
          return of(null);
        }),
        finalize(() => this.isLoading = false)
    ).subscribe(course => {
      if (course?.lessons?.length) {
        const lesson = course.lessons.find(l => l.id === lessonId);
        if (lesson) {
          // Mevcut videoUrl'yi videoId olarak kullan (backward compatibility)
          const videoId = lesson.videoUrl || '';
          this.selectedVideoId = videoId;
          this.selectedVideoTitle = videoId ? this.getVideoTitleFromId(videoId) : null;

          this.lessonForm.patchValue({
            title: lesson.title,
            description: lesson.description,
            videoId: videoId, // videoUrl yerine videoId
            lessonOrder: lesson.lessonOrder,
            duration: lesson.duration,
            isPreview: lesson.preview, // isPreview'ı isPreview'e atayın
            resources: lesson.resources ? lesson.resources.join('\n') : ''
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
   * Form gönderimini handle eder
   * Video ID'sini videoUrl field'ına ve isPreview'i preview field'ına map eder (backend uyumluluğu için)
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

    // Backend uyumluluğu için formdan gelen verileri doğru DTO yapısına map et
    const lessonData: LessonDTO = {
      id:rawLessonData.id,
      title: rawLessonData.title,
      description: rawLessonData.description,
      lessonOrder: rawLessonData.lessonOrder,
      duration: rawLessonData.duration,
      videoUrl: rawLessonData.videoId, // Backend hala videoUrl bekliyor
      preview: rawLessonData.isPreview, // DÜZELTME: isPreview'i isPreview'e map ediyoruz
      resources: rawLessonData.resources
          ? rawLessonData.resources.split('\n').filter((item: string) => item.trim() !== '')
          : []
    };

    let operation: Observable<any>;
    if (this.isEditMode && this.courseId && this.lessonId) {
      operation = this.courseService.updateLessonInCourse(this.courseId, this.lessonId, lessonData);
    } else if (this.courseId) {
      console.log(lessonData);
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

        // Session storage'ı temizle
        sessionStorage.removeItem('lesson-form-data');

        // Kurs detay sayfasına yönlendir
        setTimeout(() => {
          this.router.navigate(['/courses', this.courseId]);
        }, 1500);
      }
    });
  }



  /**
   * Video ID'sinden video başlığını çıkarır
   */
  getVideoTitleFromId(videoId: string): string {
    if (!videoId) return '';

    try {
      // UUID_ kısmını çıkar ve dosya uzantısını temizle
      const titlePart = videoId.split('_')[1];
      if (titlePart) {
        return titlePart.replace(/\.(mp4|avi|mov|mkv|webm)$/i, '');
      }
    } catch (error) {
      console.warn('Video ID\'sinden başlık çıkarılamadı:', error);
    }

    return videoId;
  }

  clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
  }

  /**
   * Component destroy olduğunda cleanup işlemleri
   */
  ngOnDestroy(): void {
    // Session storage'ı temizle
    sessionStorage.removeItem('lesson-form-data');
  }
}
