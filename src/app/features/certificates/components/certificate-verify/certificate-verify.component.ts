// certificate-verify.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // ngIf gibi direktifler için
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms'; // Reaktif formlar için
import { RouterLink } from '@angular/router'; // routerLink için
import { TranslateModule, TranslateService } from '@ngx-translate/core'; // ngx-translate için
import { CertificateService } from '../../services/certificate.service'; // CertificateService'i import ediyoruz
import { CertificateResponse } from '../../models/certificate.models'; // CertificateResponse modelini import ediyoruz
import { catchError, finalize } from 'rxjs/operators'; // Hata yakalama ve tamamlanma için
import { of } from 'rxjs'; // Observable oluşturmak için
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component'; // Loading Spinner için
import { AlertDialogComponent } from '../../../../shared/components/alert-dialog/alert-dialog.component'; // Alert Dialog için

@Component({
  selector: 'app-certificate-verify',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TranslateModule,
    LoadingSpinnerComponent,
    AlertDialogComponent
  ],
  templateUrl: './certificate-verify.component.html',
  styleUrl: './certificate-verify.component.css'
})
export class CertificateVerifyComponent implements OnInit {
  verifyForm!: FormGroup; // Sertifika doğrulama formu grubu
  certificate: CertificateResponse | null = null; // Doğrulanmış sertifika bilgileri
  isLoading: boolean = false; // Yükleme durumu
  errorMessage: string | null = null; // Hata mesajı
  successMessage: string | null = null; // Başarı mesajı

  constructor(
    private certificateService: CertificateService,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.initForm(); // Formu başlat
  }

  /**
   * Doğrulama formunu başlatır.
   */
  initForm(): void {
    this.verifyForm = new FormGroup({
      uniqueCode: new FormControl('', [Validators.required, Validators.minLength(5)]) // Benzersiz kod alanı, zorunlu ve min 5 karakter
    });
  }

  // Form kontrollerine kolay erişim için getter
  get uniqueCode() { return this.verifyForm.get('uniqueCode'); }

  /**
   * Doğrulama formunu gönderir.
   * Backend API'sine sertifika doğrulama isteği gönderir.
   */
  onSubmit(): void {
    this.errorMessage = null;
    this.successMessage = null;
    this.certificate = null; // Önceki sertifika bilgilerini temizle

    if (this.verifyForm.invalid) {
      this.errorMessage = this.translate.instant('INVALID_FORM_DATA');
      this.verifyForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    const code = this.uniqueCode?.value;

    this.certificateService.getCertificateByUniqueCode(code).pipe(
      catchError(error => {
        this.errorMessage = error.message || this.translate.instant('CERTIFICATE_VERIFY_FAILED_GENERIC');
        return of(null);
      }),
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe(cert => {
      if (cert) {
        this.certificate = cert;
        this.successMessage = this.translate.instant('CERTIFICATE_VERIFY_SUCCESS');
      } else {
        this.errorMessage = this.translate.instant('CERTIFICATE_NOT_FOUND_OR_INVALID'); // Servis null döndürürse
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
