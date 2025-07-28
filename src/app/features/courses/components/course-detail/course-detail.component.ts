// course-detail.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router'; // Router import edildi
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CourseService } from '../../services/course.service';
import { CourseDetailsResponse, LessonDTO } from '../../models/course.models';

import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertDialogComponent } from '../../../../shared/components/alert-dialog/alert-dialog.component';
import { TokenService } from '../../../../core/services/token.service';

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    LoadingSpinnerComponent,
    AlertDialogComponent
  ],
  templateUrl: './course-detail.component.html',
  styleUrl: './course-detail.component.css'
})
export class CourseDetailComponent implements OnInit {
  course: CourseDetailsResponse | null = null;
  isLoading: boolean = true;
  errorMessage: string | null = null;
  successMessage: string | null = null; // Başarı mesajı eklendi
  courseId: number | null = null;
  isInstructorOrAdmin: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private courseService: CourseService,
    private translate: TranslateService,
    private tokenService: TokenService,
    private router: Router // Router enjekte edildi
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('courseId');
      if (id) {
        this.courseId = +id;
        this.loadCourseDetails(this.courseId);
      } else {
        this.errorMessage = this.translate.instant('COURSE_ID_NOT_FOUND');
        this.isLoading = false;
      }
    });

    this.tokenService.userRole$.subscribe(role => {
      this.isInstructorOrAdmin = role === 'ROLE_INSTRUCTOR' || role === 'ROLE_ADMIN';
    });
  }

  /**
   * Belirli bir eğitimin detaylarını backend'den yükler.
   * @param id Eğitimin ID'si.
   */
  loadCourseDetails(id: number): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null; // Mesajları temizle

    this.courseService.getCourseDetailsById(id).pipe(
      catchError(error => {
        this.errorMessage = error.message || this.translate.instant('COURSE_DETAIL_LOAD_FAILED_GENERIC');
        return of(null);
      }),
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe(course => {
      if (course) {
        this.course = course;
        if (this.course.lessons) {
          this.course.lessons = [...this.course.lessons].sort((a, b) => a.lessonOrder - b.lessonOrder);
        }
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

  /**
   * Bir dersin video URL'sini döndürür.
   * @param lesson Ders nesnesi.
   * @returns Dersin video URL'si.
   */
  getLessonVideoUrl(lesson: LessonDTO): string {
    return lesson.videoUrl;
  }

  /**
   * Eğitime yapılan yorumların ortalama puanını hesaplar.
   * @returns Ortalama puan veya 0 eğer yorum yoksa.
   */
  getAverageRating(): number {
    if (!this.course || !this.course.reviews || this.course.reviews.length === 0) {
      return 0;
    }
    const totalRating = this.course.reviews.reduce((sum, review) => sum + review.rating, 0);
    return totalRating / this.course.reviews.length;
  }

  /**
   * Eğitimi silme işlemini başlatır.
   * @param courseId Silinecek eğitimin ID'si.
   */
  deleteCourse(courseId: number): void {
    const confirmation = confirm(this.translate.instant('CONFIRM_DELETE_COURSE')); // Onay mesajı
    if (confirmation) {
      this.isLoading = true;
      this.courseService.deleteCourse(courseId).pipe(
        catchError(error => {
          this.errorMessage = error.message || this.translate.instant('DELETE_COURSE_FAILED_GENERIC');
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      ).subscribe(response => {
        if (response === null) { // Hata durumunda null döner
          return;
        }
        this.successMessage = this.translate.instant('DELETE_COURSE_SUCCESS');
        this.router.navigate(['/courses']); // Başarılı silme sonrası eğitim listesine yönlendir
      });
    }
  }

  /**
   * Eğitimin yayınlanma durumunu değiştirir (yayınla/yayından kaldır).
   * @param courseId Durumu değiştirilecek eğitimin ID'si.
   */
  toggleCoursePublishedStatus(courseId: number): void {
    const confirmation = confirm(this.translate.instant('CONFIRM_TOGGLE_PUBLISH')); // Onay mesajı
    if (confirmation) {
      this.isLoading = true;
      this.courseService.toggleCoursePublishedStatus(courseId).pipe(
        catchError(error => {
          this.errorMessage = error.message || this.translate.instant('TOGGLE_PUBLISH_FAILED_GENERIC');
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      ).subscribe(updatedCourse => {
        if (updatedCourse) {
          this.course!.published = updatedCourse.published; // UI'ı güncelle
          this.successMessage = this.translate.instant('TOGGLE_PUBLISH_SUCCESS');
        }
      });
    }
  }

  /**
   * Bir dersi silme işlemini başlatır.
   * @param courseId Dersin ait olduğu eğitimin ID'si.
   * @param lessonId Silinecek dersin ID'si.
   */
  deleteLesson(courseId: number, lessonId: number): void {
    const confirmation = confirm(this.translate.instant('CONFIRM_DELETE_LESSON')); // Onay mesajı
    if (confirmation) {
      this.isLoading = true;
      this.courseService.deleteLessonFromCourse(courseId, lessonId).pipe(
        catchError(error => {
          this.errorMessage = error.message || this.translate.instant('DELETE_LESSON_FAILED_GENERIC');
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      ).subscribe(response => {
        if (response === null) { // Hata durumunda null döner
          return;
        }
        this.successMessage = this.translate.instant('DELETE_LESSON_SUCCESS');
        this.loadCourseDetails(courseId); // Ders listesini yenile
      });
    }
  }
}
