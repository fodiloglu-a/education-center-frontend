// profile.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { UserService } from '../../services/user.service';
import { TokenService } from '../../../../core/services/token.service';
import { UserResponse } from '../../models/user.models';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertDialogComponent } from '../../../../shared/components/alert-dialog/alert-dialog.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    LoadingSpinnerComponent,
    AlertDialogComponent
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  user: UserResponse | null = null;
  isLoading: boolean = true;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
      private userService: UserService,
      private tokenService: TokenService,
      private router: Router,
      private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.loadUserProfile();
  }

  /**
   * Kullanıcı profil bilgilerini backend'den yükler.
   */
  loadUserProfile(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    const userId = this.tokenService.getStoredUser()?.id;

    if (!userId) {
      this.errorMessage = this.translate.instant('USER_ID_NOT_FOUND');
      this.isLoading = false;
      this.tokenService.signOut();
      this.router.navigate(['/auth/login']);
      return;
    }

    this.userService.getUserById(userId).pipe(
        catchError(error => {
          this.errorMessage = error.message || this.translate.instant('PROFILE_LOAD_FAILED');
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
        })
    ).subscribe(user => {
      if (user) {
        this.user = user;
      }
    });
  }

  /**
   * Kullanıcının rolünü Türkçe/Ukraynaca olarak çevirir.
   * @param roleKey Rol anahtarı (örn. 'ROLE_USER').
   * @returns Çevrilmiş rol adı.
   */
  getTranslatedRole(roleKey: string): string {
    switch (roleKey) {
      case 'ROLE_USER': return this.translate.instant('ROLE_LEARNER');
      case 'INSTRUCTOR': return this.translate.instant('INSTRUCTOR');
      case 'ROLE_ADMIN': return this.translate.instant('ROLE_ADMIN');
      default: return roleKey;
    }
  }

  /**
   * Alert dialog kapatıldığında mesajları temizler.
   */
  clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
  }
}