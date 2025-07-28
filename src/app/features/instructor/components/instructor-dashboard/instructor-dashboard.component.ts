// instructor-dashboard.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // ngIf, ngFor gibi direktifler için
import { RouterLink } from '@angular/router'; // routerLink için
import { TranslateModule, TranslateService } from '@ngx-translate/core'; // ngx-translate için
import { InstructorService } from '../../services/instructor.service'; // InstructorService'i import ediyoruz
import { TokenService } from '../../../../core/services/token.service'; // Kullanıcı ID'si için
import { InstructorDashboardStats } from '../../models/instructor.models'; // Model import edildi
import { catchError, finalize } from 'rxjs/operators'; // Hata yakalama ve tamamlanma için
import { of } from 'rxjs'; // Observable oluşturmak için
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component'; // Loading Spinner için
import { AlertDialogComponent } from '../../../../shared/components/alert-dialog/alert-dialog.component'; // Alert Dialog için

@Component({
  selector: 'app-instructor-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    LoadingSpinnerComponent,
    AlertDialogComponent
  ],
  templateUrl: './instructor-dashboard.component.html',
  styleUrl: './instructor-dashboard.component.css'
})
export class InstructorDashboardComponent implements OnInit {
  stats: InstructorDashboardStats | null = null; // Gösterge panosu istatistikleri
  isLoading: boolean = true; // Yükleme durumu
  errorMessage: string | null = null; // Hata mesajı
  instructorId: number | null = null; // Eğitmenin ID'si

  constructor(
    private instructorService: InstructorService,
    private tokenService: TokenService,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.instructorId = this.tokenService.getUser()?.id || null; // Giriş yapmış eğitmenin ID'sini al

    if (!this.instructorId) {
      this.errorMessage = this.translate.instant('INSTRUCTOR_ID_NOT_FOUND');
      this.isLoading = false;
      return;
    }

    this.loadDashboardStats(this.instructorId);
  }

  /**
   * Eğitmen gösterge panosu istatistiklerini backend'den yükler.
   * @param id Eğitmenin ID'si.
   */
  loadDashboardStats(id: number): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.instructorService.getInstructorDashboardStats(id).pipe(
      catchError(error => {
        this.errorMessage = error.message || this.translate.instant('DASHBOARD_STATS_LOAD_FAILED');
        return of(null);
      }),
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe(stats => {
      if (stats) {
        this.stats = stats;
      } else {
        this.errorMessage = this.translate.instant('NO_DASHBOARD_STATS');
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
