// instructor-course-list.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // ngIf, ngFor gibi direktifler için
import {Router, RouterLink} from '@angular/router'; // routerLink için
import { TranslateModule, TranslateService } from '@ngx-translate/core'; // ngx-translate için
import { InstructorService } from '../../services/instructor.service'; // InstructorService'i import ediyoruz
import { TokenService } from '../../../../core/services/token.service'; // Kullanıcı ID'si için
import { InstructorCourseResponse } from '../../models/instructor.models'; // Model import edildi
import { catchError, finalize } from 'rxjs/operators'; // Hata yakalama ve tamamlanma için
import { of } from 'rxjs'; // Observable oluşturmak için
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component'; // Loading Spinner için
import { AlertDialogComponent } from '../../../../shared/components/alert-dialog/alert-dialog.component';
import {CourseService} from "../../../courses/services/course.service"; // Alert Dialog için

@Component({
  selector: 'app-instructor-course-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    LoadingSpinnerComponent,
    AlertDialogComponent
  ],
  templateUrl: './instructor-course-list.component.html',
  styleUrl: './instructor-course-list.component.css'
})
export class InstructorCourseListComponent implements OnInit {
  courses: InstructorCourseResponse[] = []; // Eğitmenin kurs listesi
  isLoading: boolean = true; // Yükleme durumu
  errorMessage: string | null = null; // Hata mesajı
  successMessage: string | null = null; // Başarı mesajı
  instructorId: number | null = null; // Eğitmenin ID'si
  errorAction: { text: string; callback: () => void } | null = null;

  constructor(
    private instructorService: InstructorService,
    private tokenService: TokenService,
    private translate: TranslateService,
    private router: Router,
    private courseService: CourseService // CourseService enjekte edildi
  ) { }

  ngOnInit(): void {
    this.instructorId = this.tokenService.getUser()?.id || null; // Giriş yapmış eğitmenin ID'sini al

    if (!this.instructorId) {
      this.errorMessage = this.translate.instant('INSTRUCTOR_ID_NOT_FOUND');
      this.isLoading = false;
      return;
    }

    this.loadInstructorCourses(this.instructorId);
  }

  /**
   * Eğitmenin oluşturduğu tüm kursları backend'den yükler.
   * @param id Eğitmenin ID'si.
   */
  loadInstructorCourses(id: number): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    this.instructorService.getInstructorCourses(id).pipe(
      catchError(error => {
        this.errorMessage = error.message || this.translate.instant('INSTRUCTOR_COURSES_LOAD_FAILED');
        return of([]);
      }),
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe(courses => {
      this.courses = courses;
    });
  }

  /**
   * Bir kursu silme işlemini başlatır.
   * @param courseId Silinecek kursun ID'si.
   */
  deleteCourse(courseId: number): void {
    const confirmation = confirm(this.translate.instant('CONFIRM_DELETE_COURSE')); // Onay mesajı
    if (confirmation && this.instructorId) {
      this.isLoading = true;
      this.courseService.deleteCourse(courseId).pipe( // CourseService'den silme metodu çağrılır
        catchError(error => {
          this.errorMessage = error.message || this.translate.instant('DELETE_COURSE_FAILED_GENERIC');
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      ).subscribe(response => {
        if (response === null) {
          return;
        }
        this.successMessage = this.translate.instant('DELETE_COURSE_SUCCESS');
        this.loadInstructorCourses(this.instructorId!); // Kurs listesini yeniden yükle
      });
    }
  }

  /**
   * Bir kursun yayınlanma durumunu değiştirir (yayınla/yayından kaldır).
   * @param courseId Durumu değiştirilecek kursun ID'si.
   */
  toggleCoursePublishedStatus(courseId: number): void {
    const confirmation = confirm(this.translate.instant('CONFIRM_TOGGLE_PUBLISH')); // Onay mesajı
    if (confirmation && this.instructorId) {
      this.isLoading = true;
      this.courseService.toggleCoursePublishedStatus(courseId).pipe( // CourseService'den yayınlama metodu çağrılır
        catchError(error => {
          this.errorMessage = error.message || this.translate.instant('TOGGLE_PUBLISH_FAILED_GENERIC');
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      ).subscribe(updatedCourse => {
        if (updatedCourse) {
          // Güncellenen kursu listede bul ve yayınlanma durumunu güncelle
          const index = this.courses.findIndex(c => c.id === updatedCourse.id);
          if (index !== -1) {
            this.courses[index].published = updatedCourse.published;
          }
          this.successMessage = this.translate.instant('TOGGLE_PUBLISH_SUCCESS');
        }
      });
    }
  }

  /**
   * Alert dialog kapatıldığında mesajları temizler.
   */
  clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
  }
  async checkAndNavigateToCourseCreation() {
    if (!this.instructorId) return;

    this.isLoading = true;
    this.clearError();

    try {
      const response = await this.instructorService.canAddCourse(this.instructorId).toPromise();

      if (response.canAdd) {
        this.router.navigate(['/courses', 'new']);
      } else {
        this.showCourseLimitError(response);
      }
    } catch (error) {
      console.error('Kurs kontrol hatası:', error);
      this.showGenericError();
    } finally {
      this.isLoading = false;
    }
  }

  private showCourseLimitError(response: any) {
    let message = '';

    if (response.errorType === 'SUBSCRIPTION_REQUIRED') {
      message = this.translate.instant(response.errorKey);
      this.showErrorWithAction(message, 'UPGRADE_SUBSCRIPTION', () => {
        this.router.navigate(['/instructor/subscription']);
      });
    } else if (response.errorType === 'COURSE_LIMIT_REACHED') {
      message = this.translate.instant(response.errorKey, {
        current: response.currentCount
      });
      this.showErrorWithAction(message, 'VIEW_SUBSCRIPTION_PLANS', () => {
        this.router.navigate(['/instructor/subscription']);
      });
    }
  }

  private showErrorWithAction(message: string, actionKey: string, action: () => void) {
    this.errorMessage = message;
    this.errorAction = {
      text: this.translate.instant(actionKey),
      callback: action
    };
  }

  private showGenericError() {
    this.errorMessage = this.translate.instant('GENERIC_ERROR');
    this.errorAction = null;
  }

  clearError() {
    this.errorMessage = null;
    this.errorAction = null;
  }
}
