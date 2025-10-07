// verification-sent.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { EmailVerificationService } from '../../../../core/services/email-verification.service';

/**
 * Email Gönderildi Bilgilendirme Component
 * Register sonrası kullanıcıya email gönderildiğini bildirir
 * Yeniden gönderme özelliği ile 2 dakika cooldown yönetimi
 *
 * Route: /auth/verification-sent?email=xxx
 */
@Component({
  selector: 'app-verification-sent',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule
  ],
  templateUrl: './verification-sent.component.html',
  styleUrl: './verification-sent.component.css'
})
export class VerificationSentComponent implements OnInit, OnDestroy {

  // Component State
  email: string = '';
  isResending: boolean = false;
  resendSuccess: boolean = false;
  resendError: string = '';
  cooldownSeconds: number = 0;
  canResend: boolean = true;

  private cooldownInterval: any;

  constructor(
      private route: ActivatedRoute,
      private router: Router,
      private emailVerificationService: EmailVerificationService
  ) { }

  ngOnInit(): void {
    // URL'den email parametresini al
    this.route.queryParams.subscribe(params => {
      this.email = params['email'];

      if (!this.email) {
        // Email yoksa register sayfasına yönlendir
        this.router.navigate(['/auth/register']);
        return;
      }

      // Email format kontrolü
      if (!this.emailVerificationService.isValidEmail(this.email)) {
        console.error('❌ Geçersiz email formatı:', this.email);
        this.router.navigate(['/auth/register']);
        return;
      }

      // Cooldown durumunu kontrol et
      this.updateCooldownStatus();
    });
  }

  ngOnDestroy(): void {
    // Interval'i temizle
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
    }
  }

  /**
   * Cooldown durumunu günceller ve timer başlatır
   */
  private updateCooldownStatus(): void {
    this.cooldownSeconds = this.emailVerificationService.getResendCooldownSeconds(this.email);
    this.canResend = this.cooldownSeconds === 0;

    if (this.cooldownSeconds > 0) {
      // Cooldown timer'ı başlat
      this.startCooldownTimer();
    }
  }

  /**
   * Cooldown timer'ını başlatır (her saniye güncellenir)
   */
  private startCooldownTimer(): void {
    this.cooldownInterval = setInterval(() => {
      this.cooldownSeconds--;

      if (this.cooldownSeconds <= 0) {
        this.canResend = true;
        clearInterval(this.cooldownInterval);
      }
    }, 1000);
  }

  /**
   * Doğrulama emailini yeniden gönderir
   */
  resendEmail(): void {
    // Cooldown kontrolü
    if (!this.canResend) {
      return;
    }

    // Email format kontrolü
    if (!this.emailVerificationService.isValidEmail(this.email)) {
      this.resendError = 'INVALID_EMAIL_FORMAT';
      return;
    }

    this.isResending = true;
    this.resendSuccess = false;
    this.resendError = '';

    this.emailVerificationService.resendVerificationEmail(this.email).subscribe({
      next: (response) => {
        // Başarılı yeniden gönderim
        this.isResending = false;
        this.resendSuccess = true;

        console.log('✅ Email yeniden gönderildi:', response);

        // Son gönderim zamanını kaydet
        this.emailVerificationService.setLastEmailSentTime(this.email);

        // Cooldown'u yeniden başlat
        this.updateCooldownStatus();

        // 3 saniye sonra success mesajını kaldır
        setTimeout(() => {
          this.resendSuccess = false;
        }, 3000);
      },
      error: (error) => {
        // Hata durumu
        this.isResending = false;
        this.resendError = error.message || 'RESEND_FAILED';

        console.error('❌ Email yeniden gönderme hatası:', error);

        // 5 saniye sonra hata mesajını kaldır
        setTimeout(() => {
          this.resendError = '';
        }, 5000);
      }
    });
  }

  /**
   * Login sayfasına yönlendirir
   */
  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  /**
   * Ana sayfaya yönlendirir
   */
  goToHome(): void {
    this.router.navigate(['/']);
  }

  /**
   * Email'in maskelenmiş halini döndürür (privacy için)
   * Örnek: test@example.com -> t***@example.com
   */
  getMaskedEmail(): string {
    if (!this.email) return '';

    const [localPart, domain] = this.email.split('@');
    if (!localPart || !domain) return this.email;

    const maskedLocal = localPart.charAt(0) + '***' + localPart.charAt(localPart.length - 1);
    return `${maskedLocal}@${domain}`;
  }

  /**
   * Cooldown süresini dakika:saniye formatında döndürür
   */
  getFormattedCooldown(): string {
    const minutes = Math.floor(this.cooldownSeconds / 60);
    const seconds = this.cooldownSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}