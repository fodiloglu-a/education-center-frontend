// certificate-detail.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // ngIf, ngFor gibi direktifler için
import { ActivatedRoute, RouterLink } from '@angular/router'; // Rota parametrelerini almak ve routerLink için
import { TranslateModule, TranslateService } from '@ngx-translate/core'; // ngx-translate için
import { CertificateService } from '../../services/certificate.service'; // CertificateService'i import ediyoruz
import { CertificateResponse } from '../../models/certificate.models'; // CertificateResponse modelini import ediyoruz
import { catchError, finalize } from 'rxjs/operators'; // Hata yakalama ve tamamlanma için
import { of } from 'rxjs'; // Observable oluşturmak için
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component'; // Loading Spinner için
import { AlertDialogComponent } from '../../../../shared/components/alert-dialog/alert-dialog.component'; // Alert Dialog için
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser'; // Sertifika URL'sini güvenli hale getirmek için

@Component({
  selector: 'app-certificate-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    LoadingSpinnerComponent,
    AlertDialogComponent
  ],
  templateUrl: './certificate-detail.component.html',
  styleUrl: './certificate-detail.component.css'
})
export class CertificateDetailComponent implements OnInit {
  certificate: CertificateResponse | null = null; // Sertifika detay bilgileri
  isLoading: boolean = true; // Yükleme durumu
  errorMessage: string | null = null; // Hata mesajı
  certificateId: number | null = null; // Rota parametresinden alınacak sertifika ID'si
  uniqueCode: string | null = null; // Rota parametresinden alınacak benzersiz kod (doğrulama için)
  safeCertificateUrl: SafeResourceUrl | null = null; // Güvenli sertifika URL'si

  constructor(
    private route: ActivatedRoute, // Aktif rota servisi
    private certificateService: CertificateService,
    private translate: TranslateService,
    private sanitizer: DomSanitizer // DomSanitizer enjekte edildi
  ) { }

  ngOnInit(): void {
    // Rota parametrelerinden certificateId veya uniqueCode'u al
    this.route.paramMap.subscribe(params => {
      const id = params.get('certificateId');
      const code = params.get('uniqueCode');

      if (id) {
        this.certificateId = +id; // String'i number'a dönüştür
        this.loadCertificateById(this.certificateId);
      } else if (code) {
        this.uniqueCode = code;
        this.loadCertificateByUniqueCode(this.uniqueCode);
      } else {
        this.errorMessage = this.translate.instant('CERTIFICATE_ID_OR_CODE_NOT_FOUND');
        this.isLoading = false;
      }
    });
  }

  /**
   * Belirli bir ID'ye sahip sertifikayı backend'den yükler.
   * @param id Sertifikanın ID'si.
   */
  loadCertificateById(id: number): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.certificateService.getCertificateById(id).pipe(
      catchError(error => {
        this.errorMessage = error.message || this.translate.instant('CERTIFICATE_LOAD_FAILED_GENERIC');
        return of(null); // Hata durumunda null döndür
      }),
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe(certificate => {
      if (certificate) {
        this.certificate = certificate;
        if (this.certificate.certificateUrl) {
          this.safeCertificateUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.certificate.certificateUrl);
        }
      } else {
        this.errorMessage = this.translate.instant('CERTIFICATE_NOT_LOADED');
      }
    });
  }

  /**
   * Belirli bir benzersiz koda sahip sertifikayı backend'den yükler (doğrulama için).
   * @param code Sertifikanın benzersiz kodu.
   */
  loadCertificateByUniqueCode(code: string): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.certificateService.getCertificateByUniqueCode(code).pipe(
      catchError(error => {
        this.errorMessage = error.message || this.translate.instant('CERTIFICATE_VERIFY_FAILED_GENERIC');
        return of(null);
      }),
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe(certificate => {
      if (certificate) {
        this.certificate = certificate;
        if (this.certificate.certificateUrl) {
          this.safeCertificateUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.certificate.certificateUrl);
        }
      } else {
        this.errorMessage = this.translate.instant('CERTIFICATE_NOT_FOUND_OR_INVALID');
      }
    });
  }

  /**
   * Alert dialog kapatıldığında mesajları temizler.
   */
  clearMessages(): void {
    this.errorMessage = null;
  }
}
