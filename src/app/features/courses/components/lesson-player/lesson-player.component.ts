// lesson-player.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core'; // OnDestroy eklendi
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CourseService } from '../../services/course.service';
import { CourseDetailsResponse, LessonDTO } from '../../models/course.models';
import { NoteService } from '../../../notes/services/note.service'; // NoteService import edildi
import { NoteRequest, NoteResponse } from '../../../notes/models/note.models'; // Note modelleri import edildi

import { catchError, finalize, takeUntil } from 'rxjs/operators'; // takeUntil eklendi
import {Observable, of, Subject} from 'rxjs'; // Subject eklendi
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertDialogComponent } from '../../../../shared/components/alert-dialog/alert-dialog.component';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TokenService } from '../../../../core/services/token.service'; // TokenService import edildi
import { ReactiveFormsModule, FormControl } from '@angular/forms'; // FormControl eklendi

@Component({
  selector: 'app-lesson-player',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    LoadingSpinnerComponent,
    AlertDialogComponent,
    ReactiveFormsModule // FormControl kullanabilmek için eklendi
  ],
  templateUrl: './lesson-player.component.html',
  styleUrl: './lesson-player.component.css'
})
export class LessonPlayerComponent implements OnInit, OnDestroy { // OnDestroy implement edildi
  courseId: number | null = null;
  lessonId: number | null = null;
  course: CourseDetailsResponse | null = null;
  currentLesson: LessonDTO | null = null;
  videoUrl: SafeResourceUrl | null = null;

  isLoading: boolean = true;
  errorMessage: string | null = null;
  successMessage: string | null = null; // Başarı mesajı için
  currentUserId: number | null = null; // Mevcut kullanıcı ID'si

  // Not alma özelliği için
  currentNote: NoteResponse | null = null;
  noteContentControl = new FormControl(''); // Not içeriği için FormControl
  isSavingNote: boolean = false;
  isLoggedIn: boolean = false; // Kullanıcının giriş yapıp yapmadığını tutmak için

  private destroy$ = new Subject<void>(); // Abonelikleri yönetmek için

  constructor(
      private route: ActivatedRoute,
      private courseService: CourseService,
      private translate: TranslateService,
      private sanitizer: DomSanitizer,
      private router: Router,
      private tokenService: TokenService, // TokenService enjekte edildi
      private noteService: NoteService // NoteService enjekte edildi
  ) { }

  ngOnInit(): void {
    this.currentUserId = this.tokenService.getUser()?.id || null;
    this.isLoggedIn = !!this.currentUserId; // Kullanıcının giriş yapıp yapmadığını ayarla

    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Eğitimin ve dersin detaylarını backend'den yükler.
   * Ders yüklendiğinde kullanıcının o derse ait notunu da çeker.
   * @param cId Eğitimin ID'si.
   * @param lId Dersin ID'si.
   */
  loadCourseAndLessonDetails(cId: number, lId: number): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null; // Mesajları temizle

    this.courseService.getCourseDetailsById(cId).pipe(
        takeUntil(this.destroy$),
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
          // Dersleri sıraya göre sırala
          this.course.lessons = [...this.course.lessons].sort((a, b) => a.lessonOrder - b.lessonOrder);
          this.currentLesson = this.course.lessons.find(lesson => lesson.id === lId) || null;

          if (this.currentLesson && this.currentLesson.videoUrl) {
            this.videoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.currentLesson.videoUrl);
            // Ders yüklendiğinde notu da yükle
            if (this.isLoggedIn && this.currentLesson.id) {
              this.loadNoteForCurrentLesson(this.currentLesson.id);
            }
          } else {
            this.errorMessage = this.translate.instant('NO_VIDEO_AVAILABLE'); // Ders bulunamadı değil, video yok
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
   * Mevcut ders için kullanıcının notunu yükler.
   * @param lessonId Notun yükleneceği dersin ID'si.
   */
  loadNoteForCurrentLesson(lessonId: number): void {
    if (!this.isLoggedIn || !this.currentUserId) {
      return; // Giriş yapmayan kullanıcılar için not yükleme
    }

    this.noteService.getUserNotesForLesson(lessonId).pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Kullanıcının ders notu yüklenirken hata:', error);
          this.currentNote = null;
          this.noteContentControl.setValue('');
          // Hata mesajını gösterme, çünkü notun olmaması normal bir durum
          return of([]);
        })
    ).subscribe(notes => {
      if (notes && notes.length > 0) {
        this.currentNote = notes[0]; // Genellikle tek bir not beklenir
        this.noteContentControl.setValue(this.currentNote.content);
      } else {
        this.currentNote = null;
        this.noteContentControl.setValue('');
      }
    });
  }

  /**
   * Notu kaydeder (yeni oluşturur veya mevcutu günceller).
   */
  saveNote(): void {
    if (!this.isLoggedIn || !this.currentUserId || !this.currentLesson?.id) {
      this.errorMessage = this.translate.instant('NOTE_SAVE_AUTH_REQUIRED');
      return;
    }

    const content = this.noteContentControl.value?.trim();
    if (!content) {
      this.errorMessage = this.translate.instant('NOTE_CONTENT_REQUIRED');
      return;
    }

    this.isSavingNote = true;
    this.errorMessage = null;
    this.successMessage = null;

    const noteRequest: NoteRequest = {
      lessonId: this.currentLesson.id,
      content: content
    };

    let operation: Observable<NoteResponse>;

    if (this.currentNote && this.currentNote.id) {
      operation = this.noteService.updateNote(this.currentNote.id, noteRequest);
    } else {
      operation = this.noteService.createNote(noteRequest);
    }

    operation.pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          this.errorMessage = error.message || this.translate.instant('NOTE_SAVE_FAILED_GENERIC');
          return of(null);
        }),
        finalize(() => {
          this.isSavingNote = false;
        })
    ).subscribe(response => {
      if (response) {
        this.currentNote = response;
        this.successMessage = this.translate.instant('NOTE_SAVE_SUCCESS');
      }
    });
  }

  /**
   * Notu siler.
   */
  deleteNote(): void {
    if (!this.currentNote || !this.currentNote.id) {
      this.errorMessage = this.translate.instant('NO_NOTE_TO_DELETE');
      return;
    }

    const confirmation = confirm(this.translate.instant('CONFIRM_DELETE_NOTE'));
    if (!confirmation) {
      return;
    }

    this.isSavingNote = true; // Yükleme spinner'ı kullanmak için
    this.errorMessage = null;
    this.successMessage = null;

    this.noteService.deleteNote(this.currentNote.id).pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          this.errorMessage = error.message || this.translate.instant('NOTE_DELETE_FAILED_GENERIC');
          return of(null);
        }),
        finalize(() => {
          this.isSavingNote = false;
        })
    ).subscribe(response => {
      // Void döneceği için response === undefined veya response === null kontrolü yapılabilir
      this.currentNote = null;
      this.noteContentControl.setValue('');
      this.successMessage = this.translate.instant('NOTE_DELETE_SUCCESS');
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
      // Yönlendirme ve ders detaylarını yeniden yükleme
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
}