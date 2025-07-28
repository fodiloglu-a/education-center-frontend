// review-form.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // ngIf, ngFor gibi direktifler için
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms'; // Reaktif formlar için
import { ActivatedRoute, Router, RouterLink } from '@angular/router'; // Rota parametrelerini almak ve yönlendirme için
import { TranslateModule, TranslateService } from '@ngx-translate/core'; // ngx-translate için
import { ReviewService } from '../../services/review.service'; // ReviewService'i import ediyoruz

import { ReviewRequest, ReviewResponse } from '../../models/review.models'; // ReviewRequest ve ReviewResponse modellerini import ediyoruz
import { catchError, finalize } from 'rxjs/operators'; // Hata yakalama ve tamamlanma için
import {Observable, of} from 'rxjs'; // Observable oluşturmak için
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component'; // Loading Spinner için
import { AlertDialogComponent } from '../../../../shared/components/alert-dialog/alert-dialog.component'; // Alert Dialog için
import { TokenService } from '../../../../core/services/token.service';
import {CourseService} from "../../../courses/services/course.service"; // Kullanıcı ID'si için

@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TranslateModule,
    LoadingSpinnerComponent,
    AlertDialogComponent
  ],
  templateUrl: './review-form.component.html',
  styleUrl: './review-form.component.css'
})
export class ReviewFormComponent implements OnInit {
  reviewForm!: FormGroup; // Yorum formu grubu
  courseId: number | null = null; // Yorumun yapılacağı eğitimin ID'si (yeni yorum için)
  reviewId: number | null = null; // Düzenleniyorsa yorumun ID'si
  isEditMode: boolean = false; // Düzenleme modunda mı?
  isLoading: boolean = true; // Yükleme durumu
  errorMessage: string | null = null; // Hata mesajı
  successMessage: string | null = null; // Başarı mesajı
  currentUserId: number | null = null; // Giriş yapmış kullanıcının ID'si
  courseTitle: string = ''; // Yorum yapılan eğitimin başlığı

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private reviewService: ReviewService,
    private courseService: CourseService, // CourseService enjekte edildi
    private translate: TranslateService,
    private tokenService: TokenService
  ) { }

  ngOnInit(): void {
    this.currentUserId = this.tokenService.getUser()?.id || null;

    if (!this.currentUserId) {
      this.errorMessage = this.translate.instant('USER_NOT_LOGGED_IN_FOR_REVIEW');
      this.isLoading = false;
      return;
    }

    this.route.paramMap.subscribe(params => {
      const cId = params.get('courseId'); // Yeni yorum için courseId
      const rId = params.get('reviewId'); // Düzenleme için reviewId

      if (cId) {
        this.courseId = +cId;
        this.loadCourseTitle(this.courseId); // Eğitimin başlığını yükle
        this.isEditMode = false;
        this.isLoading = false; // Yeni yorum oluşturuluyorsa yükleme bitti
      } else if (rId) {
        this.reviewId = +rId;
        this.isEditMode = true;
        this.loadReviewDetails(this.reviewId); // Düzenleme modundaysa yorum detaylarını yükle
      } else {
        this.errorMessage = this.translate.instant('INVALID_REVIEW_CONTEXT');
        this.isLoading = false;
      }
      this.initForm(); // Formu başlat
    });
  }

  /**
   * Yorum formunu başlatır.
   */
  initForm(): void {
    this.reviewForm = new FormGroup({
      rating: new FormControl(5, [Validators.required, Validators.min(1), Validators.max(5)]), // Puan, 1-5 arası
      comment: new FormControl('', [Validators.maxLength(500)]) // Yorum metni, maksimum 500 karakter
    });
  }

  // Form kontrollerine kolay erişim için getter'lar
  get rating() { return this.reviewForm.get('rating'); }
  get comment() { return this.reviewForm.get('comment'); }

  /**
   * Eğitimin başlığını yükler (yeni yorum eklerken gösterim için).
   * @param id Eğitimin ID'si.
   */
  loadCourseTitle(id: number): void {
    this.courseService.getCourseDetailsById(id).pipe(
      catchError(error => {
        this.errorMessage = error.message || this.translate.instant('COURSE_LOAD_FAILED_GENERIC');
        return of(null);
      })
    ).subscribe(course => {
      if (course) {
        this.courseTitle = course.title;
      } else {
        this.errorMessage = this.translate.instant('COURSE_NOT_LOADED_FOR_REVIEW');
      }
    });
  }

  /**
   * Düzenleme modundaysa yorumun detaylarını yükler ve formu doldurur.
   * @param id Yorumun ID'si.
   */
  loadReviewDetails(id: number): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.reviewService.getReviewById(id).pipe(
      catchError(error => {
        this.errorMessage = error.message || this.translate.instant('REVIEW_LOAD_FAILED_GENERIC');
        return of(null);
      }),
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe(review => {
      if (review) {
        // Yorumu yapan kullanıcının kendisi olup olmadığını kontrol et
        if (review.userId !== this.currentUserId) {
          this.errorMessage = this.translate.instant('NOT_AUTHORIZED_TO_EDIT_REVIEW');
          this.router.navigate(['/courses', review.courseId]); // Eğitimin detayına yönlendir
          return;
        }
        this.courseId = review.courseId; // Eğitimin ID'sini set et
        this.loadCourseTitle(review.courseId); // Eğitimin başlığını yükle
        this.reviewForm.patchValue({
          rating: review.rating,
          comment: review.comment
        });
      } else {
        this.errorMessage = this.translate.instant('REVIEW_NOT_LOADED');
      }
    });
  }

  /**
   * Yorum formunu gönderir.
   * Yeni yorum ekler veya mevcut yorumu günceller.
   */
  onSubmit(): void {
    this.errorMessage = null;
    this.successMessage = null;

    if (this.reviewForm.invalid) {
      this.errorMessage = this.translate.instant('INVALID_FORM_DATA');
      this.reviewForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    const reviewData: ReviewRequest = {
      courseId: this.courseId!, // courseId'nin null olmadığından eminiz
      rating: this.rating?.value,
      comment: this.comment?.value
    };

    let operation: Observable<any>;
    if (this.isEditMode && this.reviewId) {
      operation = this.reviewService.updateReview(this.reviewId, reviewData);
    } else if (this.courseId) {
      operation = this.reviewService.addReview(reviewData);
    } else {
      this.errorMessage = this.translate.instant('REVIEW_SAVE_CONTEXT_MISSING');
      this.isLoading = false;
      return;
    }

    operation.pipe(
      catchError(error => {
        this.errorMessage = error.message || this.translate.instant('REVIEW_SAVE_FAILED_GENERIC');
        return of(null);
      }),
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe(response => {
      if (response) {
        this.successMessage = this.translate.instant('REVIEW_SAVE_SUCCESS');
        // Başarılı işlem sonrası eğitimin detay sayfasına yönlendir
        this.router.navigate(['/courses', this.courseId]);
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
