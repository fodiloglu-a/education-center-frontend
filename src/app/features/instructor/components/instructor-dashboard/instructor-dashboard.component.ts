// instructor-dashboard.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InstructorService } from '../../services/instructor.service';

import { TokenService } from '../../../../core/services/token.service';
import { InstructorDashboardStats } from '../../models/instructor.models';

import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertDialogComponent } from '../../../../shared/components/alert-dialog/alert-dialog.component';
import {InstructorProfileDTO} from "../../../user/models/user.models";
import {UserService} from "../../../user/services/user.service";

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
export class InstructorDashboardComponent implements OnInit {
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

  constructor(
      private instructorService: InstructorService,
      private userService: UserService,
      private tokenService: TokenService,
      private translate: TranslateService,
      private formBuilder: FormBuilder
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

  loadDashboardData(id: number): void {
    this.isLoading = true;
    this.errorMessage = null;

    // Load both dashboard stats and profile data
    Promise.all([
      this.loadDashboardStats(id),
      this.loadInstructorProfile(id)
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
  }

  // Utility methods
  get currentYear(): number {
    return new Date().getFullYear();
  }

  refreshDashboard(): void {
    if (this.instructorId) {
      this.loadDashboardData(this.instructorId);
    }
  }
}