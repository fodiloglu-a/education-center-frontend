// lesson-player.component.ts

import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CourseService } from '../../services/course.service';
import { CourseDetailsResponse, LessonDTO, CourseResponse } from '../../models/course.models';
import { NoteService } from '../../../notes/services/note.service';
import { NoteRequest, NoteResponse } from '../../../notes/models/note.models';
import { AuthService } from '../../../../core/services/auth.service';
import { UserProfile } from '../../../auth/models/auth.models';

import { catchError, finalize, takeUntil, switchMap, tap } from 'rxjs/operators';
import {forkJoin, Observable, of, Subject} from 'rxjs';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertDialogComponent } from '../../../../shared/components/alert-dialog/alert-dialog.component';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ReactiveFormsModule, FormControl } from '@angular/forms';

interface ComponentState {
  isLoading: boolean;
  isSavingNote: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  isLoggedIn: boolean;
  currentUser: UserProfile | null;
  hasPurchasedCourse: boolean;
  isCourseOwner: boolean;
  isInstructorOrAdmin: boolean;
}

@Component({
  selector: 'app-lesson-player',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    LoadingSpinnerComponent,
    AlertDialogComponent,
    ReactiveFormsModule
  ],
  templateUrl: './lesson-player.component.html',
  styleUrl: './lesson-player.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LessonPlayerComponent implements OnInit, OnDestroy {
  // Route parameters
  courseId: number | null = null;
  lessonId: number | null = null;

  // Data properties
  course: CourseDetailsResponse | null = null;
  currentLesson: LessonDTO | null = null;
  videoUrl: SafeResourceUrl | null = null;

  // Notes
  currentNote: NoteResponse | null = null;
  noteContentControl = new FormControl('');

  // State management
  private currentState: ComponentState = {
    isLoading: true,
    isSavingNote: false,
    errorMessage: null,
    successMessage: null,
    isLoggedIn: false,
    currentUser: null,
    hasPurchasedCourse: false,
    isCourseOwner: false,
    isInstructorOrAdmin: false
  };

  // Lifecycle management
  private destroy$ = new Subject<void>();

  // Public getters for template
  get isLoading(): boolean { return this.currentState.isLoading; }
  get isSavingNote(): boolean { return this.currentState.isSavingNote; }
  get errorMessage(): string | null { return this.currentState.errorMessage; }
  get successMessage(): string | null { return this.currentState.successMessage; }
  get isLoggedIn(): boolean { return this.currentState.isLoggedIn; }
  get currentUser(): UserProfile | null { return this.currentState.currentUser; }
  get hasPurchasedCourse(): boolean { return this.currentState.hasPurchasedCourse; }
  get isCourseOwner(): boolean { return this.currentState.isCourseOwner; }
  get isInstructorOrAdmin(): boolean { return this.currentState.isInstructorOrAdmin; }

  constructor(
      private route: ActivatedRoute,
      private router: Router,
      private courseService: CourseService,
      private noteService: NoteService,
      private authService: AuthService,
      private translate: TranslateService,
      private sanitizer: DomSanitizer,
      private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ========== INITIALIZATION ==========

  private initializeComponent(): void {
    this.updateState({ isLoading: true });

    // Setup authentication and route listening
    this.authService.getCurrentUser()
        .pipe(
            takeUntil(this.destroy$),
            tap(user => {
              this.updateState({
                isLoggedIn: !!user,
                currentUser: user,
                isInstructorOrAdmin: this.hasAdminRole(user)
              });
            }),
            switchMap(() => this.route.paramMap)
        )
        .subscribe(params => {
          const cId = params.get('courseId');
          const lId = params.get('lessonId');

          if (cId && lId) {
            this.courseId = +cId;
            this.lessonId = +lId;
            this.loadCourseAndLessonDetails();
          } else {
            this.updateState({
              errorMessage: this.translate.instant('LESSON_OR_COURSE_ID_NOT_FOUND'),
              isLoading: false
            });
          }
        });
  }

  private hasAdminRole(user: UserProfile | null): boolean {
    return user?.role?.includes('ADMIN') || false;
  }

  // ========== DATA LOADING ==========

  private loadCourseAndLessonDetails(): void {
    if (!this.courseId || !this.lessonId) return;

    this.updateState({ isLoading: true, errorMessage: null, successMessage: null });

    // Check user permissions
    const checkAccess$ = this.isLoggedIn
        ? this.courseService.checkCourseAccess(this.currentUser?.id || 0, this.courseId)
        : of(false);

    const checkOwnership$ = this.isLoggedIn
        ? this.courseService.checkCourseForInstructor(this.currentUser?.id || 0, this.courseId)
        : of(false);

    forkJoin({
      hasPurchased: checkAccess$,
      isCourseOwner: checkOwnership$
    })
        .pipe(
            takeUntil(this.destroy$),
            switchMap(({ hasPurchased, isCourseOwner }) => {
              this.updateState({
                hasPurchasedCourse: hasPurchased,
                isCourseOwner: isCourseOwner,
                isInstructorOrAdmin: isCourseOwner || this.hasAdminRole(this.currentUser)
              });

              // Load course details
              return this.courseService.getCourseDetailsById(this.courseId!);
            }),
            catchError(error => {
              console.error('Error loading course data:', error);
              this.updateState({
                errorMessage: this.translate.instant('COURSE_DETAIL_LOAD_FAILED_GENERIC'),
                isLoading: false
              });
              return of(null);
            }),
            finalize(() => {
              this.updateState({ isLoading: false });
              this.cdr.markForCheck();
            })
        )
        .subscribe(course => {
          if (course) {
            this.processCourseData(course);
          }
        });
  }

  private processCourseData(course: CourseDetailsResponse): void {
    this.course = course;

    if (this.course.lessons) {
      // Sort lessons by order
      this.course.lessons = [...this.course.lessons].sort((a, b) => a.lessonOrder - b.lessonOrder);
      this.currentLesson = this.course.lessons.find(lesson => lesson.id === this.lessonId) || null;

      if (this.currentLesson) {
        // Check if user can access this lesson
        if (this.canAccessLesson(this.currentLesson)) {
          this.setupVideoPlayer();
          this.loadNoteForCurrentLesson();
        } else {
          this.updateState({
            errorMessage: this.translate.instant('LESSON_ACCESS_DENIED')
          });
        }
      } else {
        this.updateState({
          errorMessage: this.translate.instant('LESSON_NOT_FOUND')
        });
      }
    } else {
      this.updateState({
        errorMessage: this.translate.instant('NO_LESSONS_IN_COURSE')
      });
    }
  }

  private setupVideoPlayer(): void {
    if (this.currentLesson && this.currentLesson.videoUrl) {
      this.videoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.currentLesson.videoUrl);
    } else {
      this.videoUrl = null;
    }
  }

  private loadNoteForCurrentLesson(): void {
    if (!this.isLoggedIn || !this.currentLesson?.id) {
      return;
    }

    this.noteService.getUserNotesForLesson(this.currentLesson.id)
        .pipe(
            takeUntil(this.destroy$),
            catchError(error => {
              console.error('Error loading user notes:', error);
              return of([]);
            })
        )
        .subscribe(notes => {
          if (notes && notes.length > 0) {
            this.currentNote = notes[0];
            this.noteContentControl.setValue(this.currentNote.content);
          } else {
            this.currentNote = null;
            this.noteContentControl.setValue('');
          }
          this.cdr.markForCheck();
        });
  }

  // ========== ACCESS CONTROL ==========

  /**
   * Check if user can access a specific lesson
   */
  canAccessLesson(lesson: LessonDTO): boolean {
    // Preview lessons are accessible to everyone
    console.log('Preview lessons are accessible to everyone', lesson);
    if (lesson.preview) {
      return true;
    }

    // Course owners and admins can access all lessons
    if (this.isCourseOwner || this.hasAdminRole(this.currentUser)) {
      return true;
    }

    // Users who purchased the course can access all lessons
    if (this.hasPurchasedCourse) {
      return true;
    }

    return false;
  }

  /**
   * Check if current lesson is accessible
   */
  isCurrentLessonAccessible(): boolean {
    return this.currentLesson ? this.canAccessLesson(this.currentLesson) : false;
  }

  /**
   * Check if user needs to purchase course
   */
  needsToPurchaseCourse(): boolean {
    return !this.hasPurchasedCourse && !this.isCourseOwner && !this.hasAdminRole(this.currentUser);
  }

  // ========== NAVIGATION ==========

  /**
   * Navigate to next lesson
   */
  goToNextLesson(): void {
    if (!this.course || !this.currentLesson || !this.course.lessons) {
      return;
    }

    const currentIndex = this.course.lessons.findIndex(l => l.id === this.currentLesson?.id);
    if (currentIndex !== -1 && currentIndex < this.course.lessons.length - 1) {
      const nextLesson = this.course.lessons[currentIndex + 1];

      // Check if user can access next lesson
      if (this.canAccessLesson(nextLesson)) {
        this.router.navigate(['/courses', this.course.id, 'lessons', nextLesson.id]);
      } else {
        this.updateState({
          errorMessage: this.translate.instant('NEXT_LESSON_ACCESS_DENIED')
        });
      }
    } else {
      this.updateState({
        successMessage: this.translate.instant('COURSE_COMPLETED')
      });
    }
  }

  /**
   * Navigate to previous lesson
   */
  goToPreviousLesson(): void {
    if (!this.course || !this.currentLesson || !this.course.lessons) {
      return;
    }

    const currentIndex = this.course.lessons.findIndex(l => l.id === this.currentLesson?.id);
    if (currentIndex > 0) {
      const previousLesson = this.course.lessons[currentIndex - 1];

      // Check if user can access previous lesson
      if (this.canAccessLesson(previousLesson)) {
        this.router.navigate(['/courses', this.course.id, 'lessons', previousLesson.id]);
      } else {
        this.updateState({
          errorMessage: this.translate.instant('PREVIOUS_LESSON_ACCESS_DENIED')
        });
      }
    }
  }

  /**
   * Navigate to specific lesson
   */
  goToLesson(lesson: LessonDTO): void {
    if (!this.course || !lesson.id) {
      return;
    }

    // Check if user can access the lesson
    if (this.canAccessLesson(lesson)) {
      this.router.navigate(['/courses', this.course.id, 'lessons', lesson.id]);
    } else {
      this.updateState({
        errorMessage: this.translate.instant('LESSON_ACCESS_DENIED')
      });
    }
  }

  /**
   * Navigate to course purchase page
   */
  goToCourse(): void {
    if (this.course) {
      this.router.navigate(['/courses', this.course.id]);
    }
  }

  // ========== NAVIGATION HELPERS ==========

  /**
   * Check if previous button should be disabled
   */
  isPreviousButtonDisabled(): boolean {
    if (!this.course || !this.currentLesson || !this.course.lessons) {
      return true;
    }

    const currentIndex = this.course.lessons.findIndex(l => l.id === this.currentLesson?.id);
    if (currentIndex <= 0) {
      return true;
    }

    // Check if previous lesson is accessible
    const previousLesson = this.course.lessons[currentIndex - 1];
    return !this.canAccessLesson(previousLesson);
  }

  /**
   * Check if next button should be disabled
   */
  isNextButtonDisabled(): boolean {
    if (!this.course || !this.currentLesson || !this.course.lessons) {
      return true;
    }

    const currentIndex = this.course.lessons.findIndex(l => l.id === this.currentLesson?.id);
    if (currentIndex === -1 || currentIndex >= this.course.lessons.length - 1) {
      return true;
    }

    // Check if next lesson is accessible
    const nextLesson = this.course.lessons[currentIndex + 1];
    return !this.canAccessLesson(nextLesson);
  }

  // ========== NOTES MANAGEMENT ==========

  /**
   * Save or update note
   */
  saveNote(): void {
    if (!this.isLoggedIn || !this.currentLesson?.id) {
      this.updateState({
        errorMessage: this.translate.instant('NOTE_SAVE_AUTH_REQUIRED')
      });
      return;
    }

    const content = this.noteContentControl.value?.trim();
    if (!content) {
      this.updateState({
        errorMessage: this.translate.instant('NOTE_CONTENT_REQUIRED')
      });
      return;
    }

    this.updateState({ isSavingNote: true, errorMessage: null, successMessage: null });

    const noteRequest: NoteRequest = {
      lessonId: this.currentLesson.id,
      content: content
    };

    const operation$ = this.currentNote?.id
        ? this.noteService.updateNote(this.currentNote.id, noteRequest)
        : this.noteService.createNote(noteRequest);

    operation$
        .pipe(
            takeUntil(this.destroy$),
            catchError(error => {
              this.updateState({
                errorMessage: error.message || this.translate.instant('NOTE_SAVE_FAILED_GENERIC')
              });
              return of(null);
            }),
            finalize(() => {
              this.updateState({ isSavingNote: false });
              this.cdr.markForCheck();
            })
        )
        .subscribe(response => {
          if (response) {
            this.currentNote = response;
            this.updateState({
              successMessage: this.translate.instant('NOTE_SAVE_SUCCESS')
            });
          }
        });
  }

  /**
   * Delete note
   */
  deleteNote(): void {
    if (!this.currentNote?.id) {
      this.updateState({
        errorMessage: this.translate.instant('NO_NOTE_TO_DELETE')
      });
      return;
    }

    if (!confirm(this.translate.instant('CONFIRM_DELETE_NOTE'))) {
      return;
    }

    this.updateState({ isSavingNote: true, errorMessage: null, successMessage: null });

    this.noteService.deleteNote(this.currentNote.id)
        .pipe(
            takeUntil(this.destroy$),
            catchError(error => {
              this.updateState({
                errorMessage: error.message || this.translate.instant('NOTE_DELETE_FAILED_GENERIC')
              });
              return of(null);
            }),
            finalize(() => {
              this.updateState({ isSavingNote: false });
              this.cdr.markForCheck();
            })
        )
        .subscribe(() => {
          this.currentNote = null;
          this.noteContentControl.setValue('');
          this.updateState({
            successMessage: this.translate.instant('NOTE_DELETE_SUCCESS')
          });
        });
  }

  // ========== LESSON UTILITIES ==========

  /**
   * Get accessible lessons for navigation
   */
  getAccessibleLessons(): LessonDTO[] {
    if (!this.course?.lessons) {
      return [];
    }

    return this.course.lessons.filter(lesson => this.canAccessLesson(lesson));
  }

  /**
   * Get locked lessons count
   */
  getLockedLessonsCount(): number {
    if (!this.course?.lessons) {
      return 0;
    }

    return this.course.lessons.filter(lesson => !this.canAccessLesson(lesson)).length;
  }

  /**
   * Check if lesson is current lesson
   */
  isCurrentLesson(lesson: LessonDTO): boolean {
    return this.currentLesson?.id === lesson.id;
  }

  // ========== INSTRUCTOR ACTIONS ==========

  /**
   * Navigate to lesson edit (for instructors)
   */
  editCurrentLesson(): void {
    if (this.isCourseOwner && this.courseId && this.lessonId) {
      this.router.navigate(['/courses', this.courseId, 'lessons', this.lessonId, 'edit']);
    }
  }

  /**
   * Navigate to course edit (for instructors)
   */
  editCourse(): void {
    if (this.isCourseOwner && this.courseId) {
      this.router.navigate(['/courses', this.courseId, 'edit']);
    }
  }

  // ========== MESSAGE HANDLING ==========

  /**
   * Clear all messages
   */
  clearMessages(): void {
    this.updateState({
      errorMessage: null,
      successMessage: null
    });
  }

  // ========== STATE MANAGEMENT ==========

  private updateState(partialState: Partial<ComponentState>): void {
    this.currentState = { ...this.currentState, ...partialState };
  }

  // ========== UTILITY METHODS ==========

  /**
   * Format duration in minutes to readable string
   */
  formatDuration(minutes: number): string {
    if (minutes <= 0) {
      return this.translate.instant('DURATION_NOT_SPECIFIED');
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0 && mins > 0) {
      return this.translate.instant('DURATION_HOURS_MINUTES', { hours, minutes: mins });
    } else if (hours > 0) {
      return this.translate.instant('DURATION_HOURS', { hours });
    } else {
      return this.translate.instant('DURATION_MINUTES', { minutes: mins });
    }
  }

  /**
   * Track by function for lessons list
   */
  trackByLessonId(index: number, lesson: LessonDTO): number {
    return lesson.id;
  }

  // ========== RETRY MECHANISMS ==========

  /**
   * Retry loading course and lesson details
   */
  retryLoadLesson(): void {
    if (this.courseId && this.lessonId) {
      this.loadCourseAndLessonDetails();
    }
  }
}