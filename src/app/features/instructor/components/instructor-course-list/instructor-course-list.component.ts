// instructor-course-list.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // ngIf, ngFor gibi direktifler için
import { RouterLink } from '@angular/router'; // routerLink için
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

  constructor(
    private instructorService: InstructorService,
    private tokenService: TokenService,
    private translate: TranslateService,
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
}
