// profile-edit.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router'; // ActivatedRoute import edildi
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { UserService } from '../../services/user.service';
import { TokenService } from '../../../../core/services/token.service';
import { UserResponse, UserUpdateRequest } from '../../models/user.models';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertDialogComponent } from '../../../../shared/components/alert-dialog/alert-dialog.component';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TranslateModule,
    LoadingSpinnerComponent,
    AlertDialogComponent
  ],
  templateUrl: './profile-edit.component.html',
  styleUrl: './profile-edit.component.css'
})
export class ProfileEditComponent implements OnInit {
  profileEditForm!: FormGroup; // Profil düzenleme formu grubu
  user: UserResponse | null = null; // Mevcut kullanıcı bilgileri
  isLoading: boolean = true; // Yükleme durumu
  errorMessage: string | null = null; // Hata mesajı
  successMessage: string | null = null; // Başarı mesajı
  userId: number | null = null; // Kullanıcı ID'si

  constructor(
    private userService: UserService,
    private tokenService: TokenService,
    private router: Router,
    private route: ActivatedRoute, // Rota parametrelerini almak için
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.userId = this.tokenService.getUser()?.id || null; // TokenService'den kullanıcının ID'sini al

    if (!this.userId) {
      this.errorMessage = this.translate.instant('USER_ID_NOT_FOUND');
      this.isLoading = false;
      this.tokenService.signOut();
      this.router.navigate(['/auth/login']);
      return;
    }

    this.initForm(); // Formu başlat
    this.loadUserProfile(); // Kullanıcı profilini yükle
  }

  /**
   * Profil düzenleme formunu başlatır.
   */
  initForm(): void {
    this.profileEditForm = new FormGroup({
      firstName: new FormControl('', [Validators.required, Validators.minLength(2)]),
      lastName: new FormControl('', [Validators.required, Validators.minLength(2)]),
      email: new FormControl('', [Validators.required, Validators.email])
    });
  }

  // Form kontrollerine kolay erişim için getter'lar
  get firstName() { return this.profileEditForm.get('firstName'); }
  get lastName() { return this.profileEditForm.get('lastName'); }
  get email() { return this.profileEditForm.get('email'); }

  /**
   * Kullanıcı profil bilgilerini backend'den yükler ve formu doldurur.
   */
  loadUserProfile(): void {
    this.isLoading = true;
    this.errorMessage = null;

    if (!this.userId) { // userId'nin null olmadığını zaten kontrol ettik ama emin olmak için
      this.isLoading = false;
      return;
    }

    this.userService.getUserById(this.userId).pipe(
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
        // Formu mevcut kullanıcı bilgileriyle doldur
        this.profileEditForm.patchValue({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email
        });
      }
    });
  }

  /**
   * Profil düzenleme formunu gönderir.
   * Backend API'sine güncelleme isteği gönderir.
   */
  onSubmit(): void {
    this.errorMessage = null;
    this.successMessage = null;

    if (this.profileEditForm.invalid) {
      this.errorMessage = this.translate.instant('INVALID_FORM_DATA');
      this.profileEditForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    const userUpdateRequest: UserUpdateRequest = this.profileEditForm.value;

    if (!this.userId) {
      this.errorMessage = this.translate.instant('USER_ID_NOT_FOUND');
      this.isLoading = false;
      return;
    }

    this.userService.updateUser(this.userId, userUpdateRequest).pipe(
      catchError(error => {
        this.errorMessage = error.message || this.translate.instant('PROFILE_UPDATE_FAILED_GENERIC');
        return of(null);
      }),
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe(updatedUser => {
      if (updatedUser) {
        this.user = updatedUser;
        this.successMessage = this.translate.instant('PROFILE_UPDATE_SUCCESS');
        // TokenService'deki kullanıcı bilgilerini de güncelle (e-posta değişmiş olabilir)
        const currentUserData = this.tokenService.getUser();
        if (currentUserData) {
          this.tokenService.saveTokenAndUser({
            ...currentUserData,
            email: updatedUser.email,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName
          } as any); // JwtResponse tipine dönüştürmek için any kullanıldı, daha sonra düzeltilebilir.
        }
        // Profil sayfasına geri dön
        this.router.navigate(['/profile']);
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
