// review-list.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // ngIf, ngFor gibi direktifler için
import { ActivatedRoute, RouterLink } from '@angular/router'; // Rota parametrelerini almak için
import { TranslateModule, TranslateService } from '@ngx-translate/core'; // ngx-translate için
import { ReviewService } from '../../services/review.service'; // ReviewService'i import ediyoruz
import { ReviewResponse } from '../../models/review.models'; // ReviewResponse modelini import ediyoruz
import { catchError, finalize } from 'rxjs/operators'; // Hata yakalama ve tamamlanma için
import { of } from 'rxjs'; // Observable oluşturmak için
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component'; // Loading Spinner için
import { AlertDialogComponent } from '../../../../shared/components/alert-dialog/alert-dialog.component'; // Alert Dialog için
import { TokenService } from '../../../../core/services/token.service'; // Kullanıcı ID'si ve rol kontrolü için

@Component({
  selector: 'app-review-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    LoadingSpinnerComponent,
    AlertDialogComponent
  ],
  templateUrl: './review-list.component.html',
  styleUrl: './review-list.component.css'
})
export class ReviewListComponent implements OnInit {
  reviews: ReviewResponse[] = []; // Yorum listesi
  isLoading: boolean = true; // Yükleme durumu
  errorMessage: string | null = null; // Hata mesajı
  successMessage: string | null = null; // Başarı mesajı

  courseId: number | null = null; // Rota parametresinden alınacak eğitim ID'si
  userId: number | null = null; // Rota parametresinden alınacak kullanıcı ID'si

  currentLoggedInUserId: number | null = null; // Giriş yapmış kullanıcının ID'si
  isAdmin: boolean = false; // Kullanıcının admin olup olmadığını kontrol eder

  constructor(
    private route: ActivatedRoute,
    private reviewService: ReviewService,
    private translate: TranslateService,
    private tokenService: TokenService
  ) { }

  ngOnInit(): void {
    this.currentLoggedInUserId = this.tokenService.getUser()?.id || null;
    this.tokenService.userRole$.subscribe(role => {
      this.isAdmin = role === 'ROLE_ADMIN';
    });

    // Rota parametrelerinden courseId veya userId'yi al
    this.route.paramMap.subscribe(params => {
      const cId = params.get('courseId');
      const uId = params.get('userId');

      if (cId) {
        console.log('cId', cId);
        this.courseId = +cId;
        this.loadReviewsByCourse(this.courseId);
      } else if (this.currentLoggedInUserId) {
        console.log('uId', uId);
        this.userId = this.currentLoggedInUserId;
        this.loadReviewsByUser(this.userId);
      } else {
        console.log('BURAYA GIRDI');
        // Genel yorumlar sayfası veya hata durumu
        this.errorMessage = this.translate.instant('NO_COURSE_OR_USER_ID_FOR_REVIEWS');
        this.isLoading = false;
      }
    });
  }

  /**
   * Belirli bir eğitime ait yorumları backend'den yükler.
   * @param id Eğitimin ID'si.
   */
  loadReviewsByCourse(id: number): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    this.reviewService.getReviewsByCourseId(id).pipe(
      catchError(error => {
        this.errorMessage = error.message || this.translate.instant('REVIEWS_LOAD_FAILED_GENERIC');
        return of([]);
      }),
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe(reviews => {
      this.reviews = reviews;
    });
  }

  /**
   * Belirli bir kullanıcıya ait yorumları backend'den yükler.
   * @param id Kullanıcının ID'si.
   */
  loadReviewsByUser(id: number): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    this.reviewService.getReviewsByUserId(id).pipe(
      catchError(error => {
        this.errorMessage = error.message || this.translate.instant('REVIEWS_LOAD_FAILED_GENERIC');
        return of([]);
      }),
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe(reviews => {
      this.reviews = reviews;
    });
  }

  /**
   * Bir yorumu silme işlemini başlatır.
   * @param reviewId Silinecek yorumun ID'si.
   */
  deleteReview(reviewId: number): void {
    const confirmation = confirm(this.translate.instant('CONFIRM_DELETE_REVIEW'));
    if (confirmation) {
      this.isLoading = true;
      this.reviewService.deleteReview(reviewId).pipe(
        catchError(error => {
          this.errorMessage = error.message || this.translate.instant('DELETE_REVIEW_FAILED_GENERIC');
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      ).subscribe(response => {
        if (response === null) {
          return;
        }
        this.successMessage = this.translate.instant('DELETE_REVIEW_SUCCESS');
        // Yorum listesini yeniden yükle
        if (this.courseId) {
          this.loadReviewsByCourse(this.courseId);
        } else if (this.userId) {
          this.loadReviewsByUser(this.userId);
        }
      });
    }
  }

  /**
   * Kullanıcının bir yorumu düzenleme veya silme yetkisi olup olmadığını kontrol eder.
   * @param review Yorum nesnesi.
   * @returns Yetki varsa true, aksi takdirde false.
   */
  canModifyReview(review: ReviewResponse): boolean {
    return (this.currentLoggedInUserId !== null && review.userId === this.currentLoggedInUserId) || this.isAdmin;
  }

  /**
   * Alert dialog kapatıldığında mesajları temizler.
   */
  clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
  }
}
