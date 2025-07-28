// password-change.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { UserService } from '../../services/user.service';
import { TokenService } from '../../../../core/services/token.service';
import { PasswordChangeRequest } from '../../models/user.models';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertDialogComponent } from '../../../../shared/components/alert-dialog/alert-dialog.component';

@Component({
  selector: 'app-password-change',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TranslateModule,
    LoadingSpinnerComponent,
    AlertDialogComponent
  ],
  templateUrl: './password-change.component.html',
  styleUrl: './password-change.component.css'
})
export class PasswordChangeComponent implements OnInit {
  passwordChangeForm!: FormGroup; // Şifre değiştirme formu grubu
  isLoading: boolean = false; // Yükleme durumu
  errorMessage: string | null = null; // Hata mesajı
  successMessage: string | null = null; // Başarı mesajı
  userId: number | null = null; // Kullanıcı ID'si

  constructor(
    private userService: UserService,
    private tokenService: TokenService,
    private router: Router,
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
  }

  /**
   * Şifre değiştirme formunu başlatır.
   */
  initForm(): void {
    this.passwordChangeForm = new FormGroup({
      oldPassword: new FormControl('', [Validators.required]), // Eski şifre alanı, zorunlu
      newPassword: new FormControl('', [Validators.required, Validators.minLength(6)]), // Yeni şifre, zorunlu ve min 6 karakter
      confirmNewPassword: new FormControl('', [Validators.required]) // Yeni şifre tekrarı, zorunlu
    });

    // Yeni şifre ve tekrarı eşleşiyor mu kontrolü
    this.passwordChangeForm.get('confirmNewPassword')?.setValidators([
      Validators.required,
      this.matchPasswords.bind(this.passwordChangeForm) // Custom validator
    ]);
  }

  // Form kontrollerine kolay erişim için getter'lar
  get oldPassword() { return this.passwordChangeForm.get('oldPassword'); }
  get newPassword() { return this.passwordChangeForm.get('newPassword'); }
  get confirmNewPassword() { return this.passwordChangeForm.get('confirmNewPassword'); }

  /**
   * Özel doğrulayıcı: Yeni şifre ve tekrarının eşleşip eşleşmediğini kontrol eder.
   * @param control FormControl nesnesi (confirmNewPassword)
   * @returns Eğer şifreler eşleşmiyorsa { mismatch: true } objesi, aksi takdirde null.
   */
  matchPasswords(control: FormControl): { [s: string]: boolean } | null {
    const formGroup = control.parent as FormGroup; // FormGroup'a erişim
    if (formGroup) {
      const newPasswordControl = formGroup.get('newPassword');
      const confirmNewPasswordControl = control; // Bu, confirmNewPassword kontrolü

      if (newPasswordControl && confirmNewPasswordControl && newPasswordControl.value !== confirmNewPasswordControl.value) {
        return { 'mismatch': true }; // Şifreler eşleşmiyorsa hata döndür
      }
    }
    return null; // Şifreler eşleşiyorsa hata yok
  }

  /**
   * Şifre değiştirme formunu gönderir.
   * Backend API'sine şifre değiştirme isteği gönderir.
   */
  onSubmit(): void {
    this.errorMessage = null;
    this.successMessage = null;

    if (this.passwordChangeForm.invalid) {
      this.errorMessage = this.translate.instant('INVALID_FORM_DATA');
      this.passwordChangeForm.markAllAsTouched();
      return;
    }

    // Şifrelerin eşleştiğinden emin olmak için tekrar kontrol et
    if (this.newPassword?.value !== this.confirmNewPassword?.value) {
      this.errorMessage = this.translate.instant('PASSWORDS_DO_NOT_MATCH');
      return;
    }

    this.isLoading = true;

    const passwordChangeRequest: PasswordChangeRequest = this.passwordChangeForm.value;

    if (!this.userId) {
      this.errorMessage = this.translate.instant('USER_ID_NOT_FOUND');
      this.isLoading = false;
      return;
    }

    this.userService.changePassword(this.userId, passwordChangeRequest).pipe(
      catchError(error => {
        this.errorMessage = error.message || this.translate.instant('PASSWORD_CHANGE_FAILED_GENERIC');
        return of(null);
      }),
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe(() => {
      // Başarılı olursa
      this.successMessage = this.translate.instant('PASSWORD_CHANGE_SUCCESS');
      // Formu sıfırla
      this.passwordChangeForm.reset();
      // Kullanıcıyı profil sayfasına yönlendir
      this.router.navigate(['/profile']);
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
