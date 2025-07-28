// lesson-player.component.ts

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
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-lesson-player',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    LoadingSpinnerComponent,
    AlertDialogComponent
  ],
  templateUrl: './lesson-player.component.html',
  styleUrl: './lesson-player.component.css'
})
export class LessonPlayerComponent implements OnInit {
  courseId: number | null = null;
  lessonId: number | null = null;
  course: CourseDetailsResponse | null = null;
  currentLesson: LessonDTO | null = null;
  videoUrl: SafeResourceUrl | null = null;

  isLoading: boolean = true;
  errorMessage: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private courseService: CourseService,
    private translate: TranslateService,
    private sanitizer: DomSanitizer,
    private router: Router // Router enjekte edildi
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const cId = params.get('courseId');
      const lId = params.get('lessonId');

      if (cId && lId) {
        this.courseId = +cId;
        this.lessonId = +lId;
        this.loadCourseAndLessonDetails(this.courseId, this.lessonId);
      } else {
        this.errorMessage = this.translate.instant('LESSON_OR_COURSE_ID_NOT_FOUND');
        this.isLoading = false;
      }
    });
  }

  /**
   * Eğitimin ve dersin detaylarını backend'den yükler.
   * @param cId Eğitimin ID'si.
   * @param lId Dersin ID'si.
   */
  loadCourseAndLessonDetails(cId: number, lId: number): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.courseService.getCourseDetailsById(cId).pipe(
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
          this.currentLesson = this.course.lessons.find(lesson => lesson.id === lId) || null;

          if (this.currentLesson && this.currentLesson.videoUrl) {
            this.videoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.currentLesson.videoUrl);
          } else {
            this.errorMessage = this.translate.instant('LESSON_NOT_FOUND_IN_COURSE');
          }
        } else {
          this.errorMessage = this.translate.instant('NO_LESSONS_IN_COURSE');
        }
      } else {
        this.errorMessage = this.translate.instant('COURSE_NOT_LOADED');
      }
    });
  }

  /**
   * Alert dialog kapatıldığında mesajları temizler.
   */
  clearMessages(): void {
    this.errorMessage = null;
  }

  /**
   * Bir sonraki derse geçer.
   */
  goToNextLesson(): void {
    if (this.course && this.currentLesson && this.course.lessons) {
      const currentIndex = this.course.lessons.findIndex(l => l.id === this.currentLesson?.id);
      if (currentIndex !== -1 && currentIndex < this.course.lessons.length - 1) {
        const nextLesson = this.course.lessons[currentIndex + 1];
        this.router.navigate(['/courses', this.course.id, 'lessons', nextLesson.id]);
      } else {
        this.errorMessage = this.translate.instant('NO_NEXT_LESSON');
      }
    }
  }

  /**
   * Bir önceki derse geçer.
   */
  goToPreviousLesson(): void {
    if (this.course && this.currentLesson && this.course.lessons) {
      const currentIndex = this.course.lessons.findIndex(l => l.id === this.currentLesson?.id);
      if (currentIndex > 0) {
        const previousLesson = this.course.lessons[currentIndex - 1];
        this.router.navigate(['/courses', this.course.id, 'lessons', previousLesson.id]);
      } else {
        this.errorMessage = this.translate.instant('NO_PREVIOUS_LESSON');
      }
    }
  }

  /**
   * Belirli bir derse gider.
   * @param lesson Ders nesnesi.
   */
  goToLesson(lesson: LessonDTO): void {
    if (this.course && lesson.id) {
      this.router.navigate(['/courses', this.course.id, 'lessons', lesson.id]);
    }
  }

  /**
   * Önceki ders butonunun devre dışı olup olmadığını kontrol eder.
   */
  isPreviousButtonDisabled(): boolean {
    if (!this.course || !this.currentLesson || !this.course.lessons || this.course.lessons.length === 0) {
      return true;
    }
    const currentIndex = this.course.lessons.findIndex(l => l.id === this.currentLesson?.id);
    return currentIndex === 0;
  }

  /**
   * Sonraki ders butonunun devre dışı olup olmadığını kontrol eder.
   */
  isNextButtonDisabled(): boolean {
    if (!this.course || !this.currentLesson || !this.course.lessons || this.course.lessons.length === 0) {
      return true;
    }
    const currentIndex = this.course.lessons.findIndex(l => l.id === this.currentLesson?.id);
    return currentIndex === this.course.lessons.length - 1;
  }
  isCurrentLessonFirst(): boolean {
    if (!this.course || !this.currentLesson || !this.course.lessons?.length) return false;
    return this.course.lessons[0].id === this.currentLesson.id;
  }

  isCurrentLessonLast(): boolean {
    if (!this.course || !this.currentLesson || !this.course.lessons?.length) return false;
    return this.course.lessons[this.course.lessons.length - 1].id === this.currentLesson.id;
  }

}
