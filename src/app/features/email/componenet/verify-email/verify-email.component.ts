// verify-email.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { EmailVerificationService } from '../../../../core/services/email-verification.service';
import { take } from 'rxjs/operators';

/**
 * Email Doğrulama Component
 * URL'den token alır, backend'e gönderir ve sonucu gösterir
 *
 * Route: /auth/verify-email?token=xxx
 */
@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule
  ],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.css'
})
export class VerifyEmailComponent implements OnInit, OnDestroy {

  // Component State
  isLoading: boolean = true;
  isSuccess: boolean = false;
  isError: boolean = false;
  errorMessage: string = '';
  token: string = '';
  countdown: number = 5;
  private countdownInterval: any;

  // 🆕 Static flag - Component instance'ları arasında paylaşılır
  private static isVerifying: boolean = false;
  private static verifiedTokens: Set<string> = new Set();

  constructor(
      private route: ActivatedRoute,
      private router: Router,
      private emailVerificationService: EmailVerificationService
  ) { }

  ngOnInit(): void {
    // Snapshot kullan (observable yerine) - daha güvenli
    this.token = this.route.snapshot.queryParams['token'];

    if (!this.token) {
      this.showError('TOKEN_MISSING');
      return;
    }

    // Token daha önce doğrulandı mı kontrol et
    if (VerifyEmailComponent.verifiedTokens.has(this.token)) {
      console.log('⚠️ Bu token zaten doğrulandı, tekrar istek gönderilmeyecek');
      this.showAlreadyVerified();
      return;
    }

    // Şu anda başka bir doğrulama işlemi yapılıyor mu?
    if (VerifyEmailComponent.isVerifying) {
      console.log('⚠️ Başka bir doğrulama işlemi devam ediyor, bekleniyor...');
      return;
    }

    // Token format kontrolü
    if (!this.emailVerificationService.isValidTokenFormat(this.token)) {
      this.showError('INVALID_TOKEN_FORMAT');
      return;
    }

    // Doğrulama işlemini başlat
    this.verifyEmail();
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  /**
   * Email doğrulama işlemini gerçekleştirir - SADECE BİR KEZ
   */
  verifyEmail(): void {
    // Double check
    if (VerifyEmailComponent.isVerifying) {
      console.log('⚠️ Doğrulama zaten devam ediyor!');
      return;
    }

    // Flag'i set et
    VerifyEmailComponent.isVerifying = true;
    this.isLoading = true;
    this.isError = false;

    console.log('🔄 Email doğrulama isteği gönderiliyor:', this.token);

    this.emailVerificationService.verifyEmail(this.token)
        .pipe(take(1)) // Sadece 1 değer al
        .subscribe({
          next: (response) => {
            console.log('✅ Email doğrulama BAŞARILI:', response);

            // Token'ı verified listesine ekle
            VerifyEmailComponent.verifiedTokens.add(this.token);

            // Başarılı doğrulama
            this.isLoading = false;
            this.isSuccess = true;

            // 5 saniye sonra login sayfasına yönlendir
            this.startCountdown();

            // Flag'i resetle
            VerifyEmailComponent.isVerifying = false;
          },
          error: (error) => {
            console.error('❌ Email doğrulama HATASI:', error);

            // Hata durumu
            this.isLoading = false;
            this.isError = true;
            this.errorMessage = error.message || 'VERIFICATION_FAILED';

            // Flag'i resetle (tekrar deneme için)
            VerifyEmailComponent.isVerifying = false;
          }
        });
  }

  /**
   * Başarılı doğrulama sonrası geri sayım başlatır
   */
  private startCountdown(): void {
    this.countdownInterval = setInterval(() => {
      this.countdown--;

      if (this.countdown <= 0) {
        clearInterval(this.countdownInterval);
        this.goToLogin();
      }
    }, 1000);
  }

  /**
   * Login sayfasına yönlendirir
   */
  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  /**
   * Yeniden deneme - Doğrulama emailini yeniden gönderme sayfasına yönlendirir
   */
  requestNewLink(): void {
    this.router.navigate(['/auth/verification-sent']);
  }

  /**
   * Hata mesajını gösterir
   */
  private showError(message: string): void {
    this.isLoading = false;
    this.isError = true;
    this.errorMessage = message;
  }

  /**
   * Token zaten doğrulanmış durumunu gösterir
   */
  private showAlreadyVerified(): void {
    this.isLoading = false;
    this.isSuccess = true;
    this.startCountdown();
  }

  /**
   * Ana sayfaya yönlendirir
   */
  goToHome(): void {
    this.router.navigate(['/']);
  }
}