// profile.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // ngIf, ngFor gibi direktifler için
import { Router, RouterLink } from '@angular/router'; // Yönlendirme ve routerLink için
import { TranslateModule, TranslateService } from '@ngx-translate/core'; // ngx-translate için
import { UserService } from '../../services/user.service'; // UserService'i import ediyoruz
import { TokenService } from '../../../../core/services/token.service'; // TokenService'i import ediyoruz
import { UserResponse } from '../../models/user.models'; // UserResponse modelini import ediyoruz
import { catchError, finalize } from 'rxjs/operators'; // Hata yakalama ve tamamlanma için
import { of } from 'rxjs'; // Observable oluşturmak için
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component'; // Loading Spinner için
import { AlertDialogComponent } from '../../../../shared/components/alert-dialog/alert-dialog.component'; // Alert Dialog için

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    LoadingSpinnerComponent, // Yükleme spinner'ı için
    AlertDialogComponent // Hata/başarı mesajları için
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  user: UserResponse | null = null; // Kullanıcı bilgileri
  isLoading: boolean = true; // Yükleme durumu
  errorMessage: string | null = null; // Hata mesajı
  successMessage: string | null = null; // Başarı mesajı

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

    const userId = this.tokenService.getUser()?.id; // TokenService'den kullanıcının ID'sini al

    if (!userId) {
      this.errorMessage = this.translate.instant('USER_ID_NOT_FOUND');
      this.isLoading = false;
      this.tokenService.signOut(); // Geçersiz durum, çıkış yap
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
