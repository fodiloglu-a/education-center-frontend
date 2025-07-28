// instructor-review-list.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // ngIf, ngFor gibi direktifler için
import { RouterLink } from '@angular/router'; // routerLink için
import { TranslateModule, TranslateService } from '@ngx-translate/core'; // ngx-translate için
import { InstructorService } from '../../services/instructor.service'; // InstructorService'i import ediyoruz
import { TokenService } from '../../../../core/services/token.service'; // Kullanıcı ID'si için
import { InstructorReviewResponse } from '../../models/instructor.models'; // Model import edildi
import { catchError, finalize } from 'rxjs/operators'; // Hata yakalama ve tamamlanma için
import { of } from 'rxjs'; // Observable oluşturmak için
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component'; // Loading Spinner için
import { AlertDialogComponent } from '../../../../shared/components/alert-dialog/alert-dialog.component';
import {ReviewService} from "../../../reviews/services/review.service"; // Alert Dialog için

@Component({
  selector: 'app-instructor-review-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    LoadingSpinnerComponent,
    AlertDialogComponent
  ],
  templateUrl: './instructor-review-list.component.html',
  styleUrl: './instructor-review-list.component.css'
})
export class InstructorReviewListComponent implements OnInit {
  reviews: InstructorReviewResponse[] = []; // Eğitmenin kurslarına yapılan yorum listesi
  isLoading: boolean = true; // Yükleme durumu
  errorMessage: string | null = null; // Hata mesajı
  successMessage: string | null = null; // Başarı mesajı
  instructorId: number | null = null; // Eğitmenin ID'si
  isAdmin: boolean = false; // Kullanıcının admin olup olmadığını kontrol eder (yorum silme yetkisi için)

  constructor(
    private instructorService: InstructorService,
    private tokenService: TokenService,
    private translate: TranslateService,
    private reviewService: ReviewService // ReviewService enjekte edildi
  ) { }

  ngOnInit(): void {
    this.instructorId = this.tokenService.getUser()?.id || null; // Giriş yapmış eğitmenin ID'sini al
    this.tokenService.userRole$.subscribe(role => {
      this.isAdmin = role === 'ROLE_ADMIN';
    });

    if (!this.instructorId) {
      this.errorMessage = this.translate.instant('INSTRUCTOR_ID_NOT_FOUND');
      this.isLoading = false;
      return;
    }

    this.loadInstructorReviews(this.instructorId);
  }

  /**
   * Eğitmenin kurslarına yapılan tüm yorumları backend'den yükler.
   * @param id Eğitmenin ID'si.
   */
  loadInstructorReviews(id: number): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    this.instructorService.getInstructorReviews(id).pipe(
      catchError(error => {
        this.errorMessage = error.message || this.translate.instant('INSTRUCTOR_REVIEWS_LOAD_FAILED');
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
    const confirmation = confirm(this.translate.instant('CONFIRM_DELETE_REVIEW')); // Onay mesajı
    if (confirmation && this.instructorId) { // Eğitmen ID'si varsa devam et
      this.isLoading = true;
      this.reviewService.deleteReview(reviewId).pipe( // ReviewService'den silme metodu çağrılır
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
        this.loadInstructorReviews(this.instructorId!); // Yorum listesini yeniden yükle
      });
    }
  }

  /**
   * Kullanıcının bir yorumu düzenleme veya silme yetkisi olup olmadığını kontrol eder.
   * Eğitmen kendi kursundaki yorumları silebilir/düzenleyebilir (backend'de kontrol edilecek)
   * veya ADMIN rolündeyse herhangi bir yorumu silebilir/düzenleyebilir.
   * @param review Yorum nesnesi.
   * @returns Yetki varsa true, aksi takdirde false.
   */
  canModifyReview(review: InstructorReviewResponse): boolean {
    // Backend'deki ReviewController'da bu kontrol yapıldığı için,
    // burada sadece UI'da göstermek için basit bir kontrol yapıyoruz.
    // Asıl yetkilendirme backend'de gerçekleşir.
    return (this.instructorId !== null && review.userId === this.instructorId) || this.isAdmin;
  }

  /**
   * Alert dialog kapatıldığında mesajları temizler.
   */
  clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
  }
}
