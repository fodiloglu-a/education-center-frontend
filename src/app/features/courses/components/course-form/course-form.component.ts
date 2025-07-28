// course-form.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CourseService } from '../../services/course.service';
import { CourseDetailsResponse } from '../../models/course.models';
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
        this.loadCourseDetails(this.courseId);
      } else {
        this.isEditMode = false;
        this.isLoading = false;
      }
      this.initForm();
    });
  }

  /**
   * Eğitim formunu başlatır.
   */
  initForm(): void {
    this.courseForm = new FormGroup({
      title: new FormControl('', [Validators.required, Validators.minLength(3)]),
      description: new FormControl('', [Validators.required, Validators.minLength(10)]),
      // Düzeltilen satır: Daha genel bir URL doğrulama deseni kullanıldı
      imageUrl: new FormControl('', [Validators.required, Validators.pattern('^(https?:\/\/[^\\s\/$.?#].[^\\s]*)$')]),
      price: new FormControl(0, [Validators.required, Validators.min(0)]),
      published: new FormControl(false)
    });
  }

  // Form kontrollerine kolay erişim için getter'lar
  get title() { return this.courseForm.get('title'); }
  get description() { return this.courseForm.get('description'); }
  get imageUrl() { return this.courseForm.get('imageUrl'); }
  get price() { return this.courseForm.get('price'); }
  get published() { return this.courseForm.get('published'); }

  /**
   * Düzenleme modundaysa eğitimin detaylarını yükler ve formu doldurur.
   * @param id Eğitimin ID'si.
   */
  loadCourseDetails(id: number): void {
    this.isLoading = true;
    this.errorMessage = null;

    if (!this.currentUserId) {
      this.isLoading = false;
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
          published: course.published
        });
      } else {
        this.errorMessage = this.translate.instant('COURSE_NOT_LOADED');
      }
    });
  }

  /**
   * Eğitim formunu gönderir.
   * Yeni eğitim oluşturur veya mevcut eğitimi günceller.
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

    const courseData: CourseDetailsResponse = this.courseForm.value;
    console.log(courseData);
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
