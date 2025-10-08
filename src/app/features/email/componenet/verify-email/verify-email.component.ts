// verify-email.component.ts - GÜNCELLENMİŞ VERSİYON

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { EmailVerificationService } from '../../../../core/services/email-verification.service';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.css'
})
export class VerifyEmailComponent implements OnInit, OnDestroy {
  isLoading: boolean = true;
  isSuccess: boolean = false;
  isError: boolean = false;
  errorMessage: string = '';
  token: string = '';
  countdown: number = 5;
  private countdownInterval: any;

  // Static flag - Tüm component instance'ları arasında paylaşılır
  private static isVerifying: boolean = false;
  private static verifiedTokens: Set<string> = new Set();

  // 🆕 Instance-level flag - Bu component için istek yapıldı mı?
  private hasAttemptedVerification: boolean = false;

  constructor(
      private route: ActivatedRoute,
      private router: Router,
      private emailVerificationService: EmailVerificationService
  ) {}

  ngOnInit(): void {
    // 🔥 KRITIK: Snapshot kullan, observable DEĞİL
    this.token = this.route.snapshot.queryParams['token'];

    if (!this.token) {
      this.showError('TOKEN_MISSING');
      return;
    }

    // Token daha önce doğrulandı mı?
    if (VerifyEmailComponent.verifiedTokens.has(this.token)) {
      console.log('⚠️ Bu token zaten doğrulandı');
      this.showAlreadyVerified();
      return;
    }

    // Bu instance'da zaten bir istek yapıldı mı?
    if (this.hasAttemptedVerification) {
      console.log('⚠️ Bu component instance\'ında zaten istek yapıldı');
      return;
    }

    // Global olarak doğrulama yapılıyor mu?
    if (VerifyEmailComponent.isVerifying) {
      console.log('⚠️ Başka bir doğrulama işlemi devam ediyor');
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
    // Component destroy olurken flag'i resetle
    VerifyEmailComponent.isVerifying = false;
  }

  /**
   * Email doğrulama işlemini gerçekleştirir - SADECE BİR KEZ
   */
  verifyEmail(): void {
    // Triple check - Güvenlik için
    if (this.hasAttemptedVerification) {
      console.log('⚠️ Bu instance\'da zaten istek yapıldı!');
      return;
    }

    if (VerifyEmailComponent.isVerifying) {
      console.log('⚠️ Global doğrulama zaten devam ediyor!');
      return;
    }

    // Flag'leri set et
    this.hasAttemptedVerification = true;
    VerifyEmailComponent.isVerifying = true;
    this.isLoading = true;
    this.isError = false;

    console.log('🔄 Email doğrulama isteği gönderiliyor:', this.token);

    this.emailVerificationService.verifyEmail(this.token)
        .pipe(
            take(1) // Sadece 1 değer al ve unsubscribe
        )
        .subscribe({
          next: (response) => {
            console.log('✅ Email doğrulama BAŞARILI:', response);

            // Token'ı verified listesine ekle
            VerifyEmailComponent.verifiedTokens.add(this.token);

            // Başarılı UI durumu
            this.isLoading = false;
            this.isSuccess = true;

            // Countdown başlat
            this.startCountdown();

            // Global flag'i resetle
            VerifyEmailComponent.isVerifying = false;
          },
          error: (error) => {
            console.error('❌ Email doğrulama HATASI:', error);

            // Hata UI durumu
            this.isLoading = false;
            this.isError = true;
            this.errorMessage = error.message || 'VERIFICATION_FAILED';

            // Global flag'i resetle
            VerifyEmailComponent.isVerifying = false;
          }
        });
  }

  private startCountdown(): void {
    this.countdownInterval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(this.countdownInterval);
        this.goToLogin();
      }
    }, 1000);
  }

  goToLogin(): void {
    this.router.navigate(['/home']);
  }

  requestNewLink(): void {
    this.router.navigate(['/auth/verification-sent']);
  }

  private showError(message: string): void {
    this.isLoading = false;
    this.isError = true;
    this.errorMessage = message;
  }

  private showAlreadyVerified(): void {
    this.isLoading = false;
    this.isSuccess = true;
    this.startCountdown();
  }

  goToHome(): void {
    this.router.navigate(['/']);
  }
}