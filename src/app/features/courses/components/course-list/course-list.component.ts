// course-list.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // ngIf, ngFor gibi direktifler için
import { RouterLink } from '@angular/router'; // routerLink için
import { TranslateModule, TranslateService } from '@ngx-translate/core'; // ngx-translate için
import { CourseService } from '../../services/course.service'; // CourseService'i import ediyoruz
import { CourseResponse } from '../../models/course.models'; // CourseResponse modelini import ediyoruz
import { catchError, finalize } from 'rxjs/operators'; // Hata yakalama ve tamamlanma için
import { of } from 'rxjs'; // Observable oluşturmak için
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component'; // Loading Spinner için
import { AlertDialogComponent } from '../../../../shared/components/alert-dialog/alert-dialog.component'; // Alert Dialog için

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
export class CourseListComponent implements OnInit {
  courses: CourseResponse[] = []; // Eğitim listesi
  isLoading: boolean = true; // Yükleme durumu
  errorMessage: string | null = null; // Hata mesajı

  constructor(
    private courseService: CourseService,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.loadCourses();
  }

  /**
   * Tüm yayınlanmış eğitimleri backend'den yükler.
   */
  loadCourses(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.courseService.getAllPublishedCourses().pipe(
      catchError(error => {
        this.errorMessage = error.message || this.translate.instant('COURSE_LOAD_FAILED_GENERIC');
        return of([]); // Hata durumunda boş dizi döndür
      }),
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe(courses => {
      this.courses = courses;
    });
  }

  /**
   * Alert dialog kapatıldığında mesajları temizler.
   */
  clearMessages(): void {
    this.errorMessage = null;
  }

  // İleride arama özelliği eklenebilir
  // searchCourses(searchTerm: string): void {
  //   this.isLoading = true;
  //   this.errorMessage = null;
  //   this.courseService.searchCoursesByTitle(searchTerm).pipe(
  //     catchError(error => {
  //       this.errorMessage = error.message || this.translate.instant('SEARCH_FAILED_GENERIC');
  //       return of([]);
  //     }),
  //     finalize(() => {
  //       this.isLoading = false;
  //     })
  //   ).subscribe(courses => {
  //     this.courses = courses;
  //   });
  // }
}
