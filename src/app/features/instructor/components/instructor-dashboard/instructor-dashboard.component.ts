// instructor-dashboard.component.ts - Teacher Subscription Integration

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { InstructorService } from '../../services/instructor.service';
import { TeacherSubscriptionService } from '../../services/teacher-subscription.service';
import { TokenService } from '../../../../core/services/token.service';
import { UserService } from "../../../user/services/user.service";

import {
  InstructorDashboardStats,
  TeacherSubscriptionStatus,
  TeacherSubscriptionStatusType
} from '../../models/instructor.models';
import { InstructorProfileDTO } from "../../../user/models/user.models";

import { catchError, finalize, takeUntil } from 'rxjs/operators';
import { of, Subject } from 'rxjs';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertDialogComponent } from '../../../../shared/components/alert-dialog/alert-dialog.component';

@Component({
  selector: 'app-instructor-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    LoadingSpinnerComponent,
    AlertDialogComponent
  ],
  templateUrl: './instructor-dashboard.component.html',
  styleUrl: './instructor-dashboard.component.css'
})
export class InstructorDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Original properties
  stats: InstructorDashboardStats | null = null;
  instructorProfile: InstructorProfileDTO | null = null;
  isLoading: boolean = true;
  isUpdatingProfile: boolean = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  instructorId: number | null = null;

  // Form management
  profileForm: FormGroup;
  showProfileEditor: boolean = false;
  activeTab: 'dashboard' | 'profile' | 'settings' = 'dashboard';

  // Teacher Subscription properties
  subscriptionStatus: TeacherSubscriptionStatus | null = null;
  isLoadingSubscription: boolean = false;
  showSubscriptionInfo: boolean = false;
  subscriptionWarningMessage: string | null = null;

  // UI states for subscription
  readonly SubscriptionStatusType = TeacherSubscriptionStatusType;

  constructor(
      private instructorService: InstructorService,
      private teacherSubscriptionService: TeacherSubscriptionService,
      private userService: UserService,
      private tokenService: TokenService,
      private translate: TranslateService,
      private formBuilder: FormBuilder,
      private router: Router
  ) {
    this.profileForm = this.initializeForm();
  }

  ngOnInit(): void {
    this.instructorId = this.tokenService.getUser()?.id || null;

    if (!this.instructorId) {
      this.errorMessage = this.translate.instant('INSTRUCTOR_ID_NOT_FOUND');
      this.isLoading = false;
      return;
    }

    this.loadDashboardData(this.instructorId);
    this.setupSubscriptionStatusListener();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): FormGroup {
    return this.formBuilder.group({
      bio: ['', [Validators.maxLength(1000)]],
      profileImageUrl: [''],
      linkedinUrl: [''],
      websiteUrl: [''],
      jobTitle: ['', [Validators.maxLength(100)]],
      company: ['', [Validators.maxLength(100)]],
      yearsOfExperience: [null, [Validators.min(0), Validators.max(50)]],
      specializations: [[]],
      certifications: [[]],
      educationLevel: [''],
      university: ['', [Validators.maxLength(100)]],
      graduationYear: [null, [Validators.min(1950), Validators.max(new Date().getFullYear())]],
      hourlyRate: [null, [Validators.min(0)]],
      teachingLanguage: ['Turkish'],
      responseTimeHours: [null, [Validators.min(1)]],
      socialLinks: [[]]
    });
  }

  private setupSubscriptionStatusListener(): void {
    this.teacherSubscriptionService.subscriptionStatus$
        .pipe(takeUntil(this.destroy$))
        .subscribe(status => {
          this.subscriptionStatus = status;
          this.handleSubscriptionStatusChange(status);
        });
  }

  private handleSubscriptionStatusChange(status: TeacherSubscriptionStatus | null): void {
    if (status) {
      if (!status.isTeacher && status.needsSubscription) {
        this.subscriptionWarningMessage = status.message;
      } else {
        this.subscriptionWarningMessage = null;
      }

      // Stats'ı güncelle - subscription durumuna göre
      if (this.stats) {
        this.stats.isTeacher = status.isTeacher;
        this.stats.canPublishCourses = status.canPublishCourses;
        this.stats.subscriptionStatus = status;
      }
    }
  }

  loadDashboardData(id: number): void {
    this.isLoading = true;
    this.errorMessage = null;

    // Load dashboard stats, profile data, and subscription status
    Promise.all([
      this.loadDashboardStats(id),
      this.loadInstructorProfile(id),
      this.loadSubscriptionStatus()
    ]).finally(() => {
      this.isLoading = false;
    });
  }

  public loadDashboardStats(id: number): Promise<void> {
    return new Promise((resolve) => {
      this.instructorService.getInstructorDashboardStats(id).pipe(
          catchError(error => {
            console.error('Error loading dashboard stats:', error);
            return of(null);
          })
      ).subscribe(stats => {
        this.stats = stats;
        resolve();
      });
    });
  }

  private loadInstructorProfile(id: number): Promise<void> {
    return new Promise((resolve) => {
      this.userService.getInstructorProfile(id).pipe(
          catchError(error => {
            console.error('Error loading instructor profile:', error);
            return of(null);
          })
      ).subscribe(profile => {
        this.instructorProfile = profile;
        if (profile) {
          this.populateForm(profile);
        }
        resolve();
      });
    });
  }

  private loadSubscriptionStatus(): Promise<void> {
    return new Promise((resolve) => {
      this.isLoadingSubscription = true;

      this.teacherSubscriptionService.checkSubscriptionStatus().pipe(
          catchError(error => {
            console.error('Error loading subscription status:', error);
            return of(null);
          }),
          finalize(() => {
            this.isLoadingSubscription = false;
          })
      ).subscribe(status => {
        this.subscriptionStatus = status;
        this.handleSubscriptionStatusChange(status);
        resolve();
      });
    });
  }

  private populateForm(profile: InstructorProfileDTO): void {
    this.profileForm.patchValue({
      bio: profile.bio || '',
      profileImageUrl: profile.profileImageUrl || '',
      linkedinUrl: profile.linkedinUrl || '',
      websiteUrl: profile.websiteUrl || '',
      jobTitle: profile.jobTitle || '',
      company: profile.company || '',
      yearsOfExperience: profile.yearsOfExperience || null,
      specializations: profile.specializations || [],
      certifications: profile.certifications || [],
      educationLevel: profile.educationLevel || '',
      university: profile.university || '',
      graduationYear: profile.graduationYear || null,
      hourlyRate: profile.hourlyRate || null,
      teachingLanguage: profile.teachingLanguage || 'Turkish',
      responseTimeHours: profile.responseTimeHours || null,
      socialLinks: profile.socialLinks || []
    });
  }

  setActiveTab(tab: 'dashboard' | 'profile' | 'settings'): void {
    this.activeTab = tab;
    this.clearMessages();
  }

  toggleProfileEditor(): void {
    this.showProfileEditor = !this.showProfileEditor;
    this.clearMessages();
  }

  onSubmitProfile(): void {
    if (this.profileForm.valid && this.instructorId) {
      this.isUpdatingProfile = true;
      this.clearMessages();

      const updatedProfile: InstructorProfileDTO = {
        ...this.instructorProfile!,
        ...this.profileForm.value
      };

      this.userService.updateInstructorProfile(this.instructorId, updatedProfile).pipe(
          catchError(error => {
            this.errorMessage = error.message || this.translate.instant('PROFILE_UPDATE_FAILED');
            return of(null);
          }),
          finalize(() => {
            this.isUpdatingProfile = false;
          })
      ).subscribe(updatedProfile => {
        if (updatedProfile) {
          this.instructorProfile = updatedProfile;
          this.successMessage = this.translate.instant('PROFILE_UPDATED_SUCCESSFULLY');
          this.showProfileEditor = false;
        }
      });
    }
  }

  // Specialization methods
  addSpecialization(): void {
    const specializations = this.profileForm.get('specializations')?.value || [];
    specializations.push('');
    this.profileForm.patchValue({ specializations });
  }

  removeSpecialization(index: number): void {
    const specializations = this.profileForm.get('specializations')?.value || [];
    specializations.splice(index, 1);
    this.profileForm.patchValue({ specializations });
  }

  updateSpecialization(index: number, value: string): void {
    const specializations = this.profileForm.get('specializations')?.value || [];
    specializations[index] = value;
    this.profileForm.patchValue({ specializations });
  }

  // Certification methods
  addCertification(): void {
    const certifications = this.profileForm.get('certifications')?.value || [];
    certifications.push('');
    this.profileForm.patchValue({ certifications });
  }

  removeCertification(index: number): void {
    const certifications = this.profileForm.get('certifications')?.value || [];
    certifications.splice(index, 1);
    this.profileForm.patchValue({ certifications });
  }

  updateCertification(index: number, value: string): void {
    const certifications = this.profileForm.get('certifications')?.value || [];
    certifications[index] = value;
    this.profileForm.patchValue({ certifications });
  }

  // Social Link methods
  addSocialLink(): void {
    const socialLinks = this.profileForm.get('socialLinks')?.value || [];
    socialLinks.push('');
    this.profileForm.patchValue({ socialLinks });
  }

  removeSocialLink(index: number): void {
    const socialLinks = this.profileForm.get('socialLinks')?.value || [];
    socialLinks.splice(index, 1);
    this.profileForm.patchValue({ socialLinks });
  }

  updateSocialLink(index: number, value: string): void {
    const socialLinks = this.profileForm.get('socialLinks')?.value || [];
    socialLinks[index] = value;
    this.profileForm.patchValue({ socialLinks });
  }

  clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
    this.subscriptionWarningMessage = null;
  }

  // Teacher Subscription Methods
  navigateToSubscription(): void {
    this.router.navigate(['/instructor/subscription']);
  }

  toggleSubscriptionInfo(): void {
    this.showSubscriptionInfo = !this.showSubscriptionInfo;
  }

  refreshSubscriptionStatus(): void {
    this.loadSubscriptionStatus();
  }

  getSubscriptionPlanDisplayName(planType: string | null | undefined): string {
    if (!planType) return this.translate.instant('UNKNOWN_PLAN');

    const planNames: { [key: string]: string } = {
      'MONTHLY_BASIC': this.translate.instant('MONTHLY_BASIC_PLAN'),
      'MONTHLY_PREMIUM': this.translate.instant('MONTHLY_PREMIUM_PLAN'),
      'YEARLY_BASIC': this.translate.instant('YEARLY_BASIC_PLAN'),
      'YEARLY_PREMIUM': this.translate.instant('YEARLY_PREMIUM_PLAN'),
      'CUSTOM': this.translate.instant('CUSTOM_PLAN')
    };

    return planNames[planType] || planType;
  }

  getSubscriptionStatusType(): TeacherSubscriptionStatusType {
    return this.teacherSubscriptionService.getSubscriptionStatusType();
  }

  getDaysUntilExpiry(): number {
    if (!this.instructorProfile?.subscriptionEndDate) {
      return 0;
    }

    const endDate = new Date(this.instructorProfile.subscriptionEndDate);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }

  isSubscriptionExpiringSoon(): boolean {
    const daysUntilExpiry = this.getDaysUntilExpiry();
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  }

  isSubscriptionExpired(): boolean {
    const daysUntilExpiry = this.getDaysUntilExpiry();
    return daysUntilExpiry <= 0 && this.instructorProfile?.subscriptionEndDate != null;
  }

  // Subscription-dependent feature checks
  canCreateCourse(): boolean {
    return this.instructorProfile?.isTeacher || false;
  }

  canAccessCourses(): boolean {
    return this.instructorProfile?.isTeacher || false;
  }

  canAccessReviews(): boolean {
    return this.instructorProfile?.isTeacher || false;
  }

  canAddMaterial(): boolean {
    return this.instructorProfile?.isTeacher || false;
  }

  canCreateCoupons(): boolean {
    return this.instructorProfile?.isTeacher || false;
  }

  // Subscription warning methods
  shouldShowSubscriptionWarning(): boolean {
    return !this.instructorProfile?.isTeacher && !this.isLoading;
  }

  shouldShowSubscriptionExpiredWarning(): boolean {
    return this.isSubscriptionExpired();
  }

  shouldShowSubscriptionExpiringSoonWarning(): boolean {
    return this.isSubscriptionExpiringSoon();
  }

  getSubscriptionWarningMessage(): string {
    if (this.isSubscriptionExpired()) {
      return this.translate.instant('SUBSCRIPTION_EXPIRED_MESSAGE');
    } else if (this.isSubscriptionExpiringSoon()) {
      return this.translate.instant('SUBSCRIPTION_EXPIRING_SOON_MESSAGE', {
        days: this.getDaysUntilExpiry()
      });
    } else if (!this.instructorProfile?.isTeacher) {
      return this.translate.instant('SUBSCRIPTION_REQUIRED_MESSAGE');
    }
    return '';
  }

  // Utility methods
  get currentYear(): number {
    return new Date().getFullYear();
  }

  get isTeacher(): boolean {
    return this.instructorProfile?.isTeacher || false;
  }

  get hasActiveSubscription(): boolean {
    return this.isTeacher && !this.isSubscriptionExpired();
  }

  refreshDashboard(): void {
    if (this.instructorId) {
      this.loadDashboardData(this.instructorId);
    }
  }

  // Navigation helpers
  navigateToCreateCourse(): void {
    if (this.canCreateCourse()) {
      this.router.navigate(['/courses', 'new']);
    } else {
      this.navigateToSubscription();
    }
  }

  navigateToMyCourses(): void {
    if (this.canAccessCourses()) {
      this.router.navigate(['/instructor', 'courses']);
    } else {
      this.navigateToSubscription();
    }
  }

  navigateToMyReviews(): void {
    if (this.canAccessReviews()) {
      this.router.navigate(['/instructor', 'reviews']);
    } else {
      this.navigateToSubscription();
    }
  }

  navigateToAddMaterial(): void {
    if (this.canAddMaterial()) {
      this.router.navigate(['/instructor', 'add-material']);
    } else {
      this.navigateToSubscription();
    }
  }
}