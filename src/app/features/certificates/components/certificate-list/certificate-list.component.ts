// certificate-list.component.ts

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
import { TokenService } from '../../../../core/services/token.service'; // Kullanıcı ID'si ve rol kontrolü için

@Component({
  selector: 'app-certificate-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    LoadingSpinnerComponent,
    AlertDialogComponent
  ],
  templateUrl: './certificate-list.component.html',
  styleUrl: './certificate-list.component.css'
})
export class CertificateListComponent implements OnInit {
  certificates: CertificateResponse[] = []; // Sertifika listesi
  isLoading: boolean = true; // Yükleme durumu
  errorMessage: string | null = null; // Hata mesajı
  successMessage: string | null = null; // Başarı mesajı

  currentLoggedInUserId: number | null = null; // Giriş yapmış kullanıcının ID'si
  isAdmin: boolean = false; // Kullanıcının admin olup olmadığını kontrol eder

  constructor(
    public route: ActivatedRoute, // Düzeltilen satır: 'private' yerine 'public' yapıldı
    private certificateService: CertificateService,
    private translate: TranslateService,
    private tokenService: TokenService
  ) { }

  ngOnInit(): void {
    this.currentLoggedInUserId = this.tokenService.getUser()?.id || null;
    this.tokenService.userRole$.subscribe(role => {
      this.isAdmin = role === 'ROLE_ADMIN';
    });

    this.route.paramMap.subscribe(params => {
      const uId = params.get('userId');
      const targetUserId = uId ? +uId : this.currentLoggedInUserId;

      if (targetUserId) {
        this.loadCertificatesByUserId(targetUserId);
      } else {
        this.errorMessage = this.translate.instant('USER_ID_NOT_FOUND_FOR_CERTIFICATES');
        this.isLoading = false;
      }
    });
  }

  /**
   * Belirli bir kullanıcıya ait sertifikaları backend'den yükler.
   * @param id Kullanıcının ID'si.
   */
  loadCertificatesByUserId(id: number): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    this.certificateService.getCertificatesByUserId(id).pipe(
      catchError(error => {
        this.errorMessage = error.message || this.translate.instant('CERTIFICATES_LOAD_FAILED_GENERIC');
        return of([]);
      }),
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe(certs => {
      this.certificates = certs;
    });
  }

  /**
   * Bir sertifikayı silme işlemini başlatır.
   * @param certificateId Silinecek sertifikanın ID'si.
   */
  deleteCertificate(certificateId: number): void {
    const confirmation = confirm(this.translate.instant('CONFIRM_DELETE_CERTIFICATE'));
    if (confirmation) {
      this.isLoading = true;
      this.certificateService.deleteCertificate(certificateId).pipe(
        catchError(error => {
          this.errorMessage = error.message || this.translate.instant('DELETE_CERTIFICATE_FAILED_GENERIC');
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      ).subscribe(response => {
        if (response === null) {
          return;
        }
        this.successMessage = this.translate.instant('DELETE_CERTIFICATE_SUCCESS');
        const targetUserId = this.route.snapshot.paramMap.get('userId') ? +this.route.snapshot.paramMap.get('userId')! : this.currentLoggedInUserId;
        if (targetUserId) {
          this.loadCertificatesByUserId(targetUserId);
        }
      });
    }
  }

  /**
   * Kullanıcının bir sertifikayı silme yetkisi olup olmadığını kontrol eder.
   * @param certificate Sertifika nesnesi.
   * @returns Yetki varsa true, aksi takdirde false.
   */
  canModifyCertificate(certificate: CertificateResponse): boolean {
    return (this.currentLoggedInUserId !== null && certificate.userId === this.currentLoggedInUserId) || this.isAdmin;
  }

  /**
   * Alert dialog kapatıldığında mesajları temizler.
   */
  clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
  }
}
