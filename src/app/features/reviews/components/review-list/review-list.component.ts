// src/app/features/reviews/components/review-list/review-list.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ReviewService } from '../../services/review.service';
import { ReviewResponse } from '../../models/review.models';
import { NoteService } from '../../../notes/services/note.service';
import { NoteResponse } from '../../../notes/models/note.models';
import { catchError, finalize, forkJoin } from 'rxjs'; // forkJoin import edildi
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertDialogComponent } from '../../../../shared/components/alert-dialog/alert-dialog.component';
import { TokenService } from '../../../../core/services/token.service';
import { Observable, of } from 'rxjs'; // 'of' ve 'Observable' import edildi

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
  reviews: ReviewResponse[] = [];
  userNotes: NoteResponse[] = [];
  isLoading: boolean = true;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  courseId: number | null = null;
  userId: number | null = null;

  currentLoggedInUserId: number | null = null;
  isAdmin: boolean = false;
  isInstructor: boolean = false;

  constructor(
      private route: ActivatedRoute,
      private router: Router,
      private reviewService: ReviewService,
      private noteService: NoteService,
      private translate: TranslateService,
      private tokenService: TokenService
  ) { }

  ngOnInit(): void {
    this.currentLoggedInUserId = this.tokenService.getUser()?.id || null;
    this.tokenService.userRole$.subscribe(role => {
      this.isAdmin = role === 'ROLE_ADMIN';
      this.isInstructor = role === 'ROLE_INSTRUCTOR';
    });

    this.route.paramMap.subscribe(params => {
      const cId = params.get('courseId');
      const uId = params.get('userId');

      this.reviews = [];
      this.userNotes = [];
      this.errorMessage = null;
      this.successMessage = null;

      if (cId) {
        this.courseId = +cId;
        this.userId = null; // Ensure userId is null if courseId is present
      } else if (uId) {
        this.userId = +uId;
        this.courseId = null; // Ensure courseId is null if userId is present
      } else if (this.currentLoggedInUserId) {
        // If no ID in URL but user is logged in, show their own reviews/notes
        this.userId = this.currentLoggedInUserId;
        this.courseId = null;
      } else {
        this.errorMessage = this.translate.instant('NO_COURSE_OR_USER_ID_FOR_REVIEWS_AND_NOTES');
        this.isLoading = false;
        return; // Hata durumunda daha fazla yükleme yapma
      }

      this.loadReviewsAndNotesForContext();
    });

  }

  /**
   * Loads reviews and/or notes based on the current context (courseId or userId).
   */
  loadReviewsAndNotesForContext(): void {
    this.isLoading = true;
    this.errorMessage = null;

    const observables: { [key: string]: Observable<any> } = {};

    if (this.courseId) {
      observables['reviews'] = this.reviewService.getReviewsByCourseId(this.courseId);
    } else if (this.userId) {
      observables['reviews'] = this.reviewService.getReviewsByUserId(this.userId);
      observables['notes'] = this.noteService.getAllNotesByUserId(this.userId);
    }

    // Eğer hiç observable yoksa, yüklemeyi bitir.
    if (Object.keys(observables).length === 0) {
      this.isLoading = false;
      return;
    }

    forkJoin(observables).pipe(
        catchError(error => {
          console.error('Veri yüklenirken hata oluştu:', error);
          this.errorMessage = error.message || this.translate.instant('REVIEWS_AND_NOTES_LOAD_FAILED_GENERIC');
          return of({}); // Hata durumunda boş bir obje döndürerek observable'ı tamamla
        }),
        finalize(() => {
          this.isLoading = false;
        })
    ).subscribe((results: Record<string, any>) => { // 'results' tipini açıkça belirt
      if (results['reviews']) {
        this.reviews = results['reviews'] as ReviewResponse[];
      } else {
        this.reviews = []; // reviews alanı yoksa boş dizi ata
      }

      if (results['notes']) {
        this.userNotes = results['notes'] as NoteResponse[];
      } else {
        this.userNotes = []; // notes alanı yoksa boş dizi ata
      }
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
      ).subscribe(() => {
        this.successMessage = this.translate.instant('DELETE_REVIEW_SUCCESS');
        this.loadReviewsAndNotesForContext();
      });
    }
  }

  /**
   * Bir notu silme işlemini başlatır.
   * @param noteId Silinecek notun ID'si.
   */
  deleteNote(noteId: number): void {
    const confirmation = confirm(this.translate.instant('CONFIRM_DELETE_NOTE'));
    if (confirmation) {
      this.isLoading = true;
      this.noteService.deleteNote(noteId).pipe(
          catchError(error => {
            this.errorMessage = error.message || this.translate.instant('NOTE_DELETE_FAILED_GENERIC');
            return of(null);
          }),
          finalize(() => {
            this.isLoading = false;
          })
      ).subscribe(() => {
        this.successMessage = this.translate.instant('NOTE_DELETE_SUCCESS');
        this.loadReviewsAndNotesForContext();
      });
    }
  }

  /**
   * Kullanıcının bir yorumu düzenleme veya silme yetkisi olup olmadığını kontrol eder.
   * @param review Yorum nesnesi.
   * @returns Yetki varsa true, aksi takdirde false.
   */
  canModifyReview(review: ReviewResponse): boolean {
    return (this.currentLoggedInUserId !== null && review.userId === this.currentLoggedInUserId) || this.isAdmin || this.isInstructor;
  }

  /**
   * Kullanıcının bir notu düzenleme veya silme yetkisi olup olmadığını kontrol eder.
   * @param note Not nesnesi.
   * @returns Yetki varsa true, aksi takdirde false.
   */
  canModifyNote(note: NoteResponse): boolean {
    return (this.currentLoggedInUserId !== null && note.userId === this.currentLoggedInUserId) || this.isAdmin || this.isInstructor;
  }

  /**
   * Alert dialog kapatıldığında mesajları temizler.
   */
  clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
  }

  /**
   * Kurs detay sayfasına yönlendirir.
   * @param courseId Kurs ID'si.
   */
  goToCourseDetail(courseId: number): void {
    this.router.navigate(['/courses', courseId]);
  }

  /**
   * Ders oynatıcı sayfasına yönlendirir.
   * @param courseId Dersin ait olduğu kurs ID'si.
   * @param lessonId Ders ID'si.
   */
  goToLessonPlayer(courseId: number | undefined, lessonId: number): void {
    if (courseId) {
      this.router.navigate(['/courses', courseId, 'lessons', lessonId]);
    } else {
      this.errorMessage = this.translate.instant('ERROR_COURSE_ID_MISSING_FOR_NOTE_NAVIGATION');
    }
  }
}