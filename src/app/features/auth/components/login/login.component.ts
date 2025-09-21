// login.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // ngIf, ngFor gibi direktifler için
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms'; // Reaktif formlar için
import { Router, RouterLink } from '@angular/router'; // Yönlendirme ve routerLink için
import { TranslateModule, TranslateService } from '@ngx-translate/core'; // ngx-translate için
import { AuthService } from '../../../../core/services/auth.service'; // AuthService'i import ediyoruz
import { TokenService } from '../../../../core/services/token.service'; // TokenService'i import ediyoruz
import { LoginRequest } from '../../models/auth.models'; // LoginRequest modelini import ediyoruz
import { catchError, finalize } from 'rxjs/operators'; // Hata yakalama ve tamamlanma için
import { of } from 'rxjs'; // Observable oluşturmak için

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule, // Reaktif formlar için gerekli
    RouterLink, // routerLink direktifi için
    TranslateModule // ngx-translate için gerekli
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup; // Giriş formu grubu
  errorMessage: string | null = null; // Hata mesajı
  isLoading: boolean = false; // Yükleme durumu

  constructor(
    private authService: AuthService,
    private tokenService: TokenService,
    private router: Router,
    private translate: TranslateService // Dil desteği için
  ) { }

  ngOnInit(): void {
    // Giriş formunu başlat
    this.loginForm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]), // E-posta alanı, zorunlu ve e-posta formatında olmalı
      password: new FormControl('', [Validators.required, Validators.minLength(6)]) // Şifre alanı, zorunlu ve minimum 6 karakter olmalı
    });
  }

  // Form kontrollerine kolay erişim için getter
  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }

  /**
   * Giriş formunu gönderir.
   * Backend API'sine kimlik doğrulama isteği gönderir.
   */
  onSubmit(): void {
    this.errorMessage = null; // Önceki hata mesajını temizle

    if (this.loginForm.invalid) {
      // Form geçersizse, hata mesajı göster veya alanları işaretle
      this.errorMessage = this.translate.instant('INVALID_FORM_DATA'); // Çevrilmiş hata mesajı
      this.loginForm.markAllAsTouched(); // Tüm alanları dokunulmuş olarak işaretle
      return;
    }

    this.isLoading = true; // Yükleme durumunu başlat

    const loginRequest: LoginRequest = this.loginForm.value; // Form değerlerini LoginRequest objesine ata

    this.authService.login(loginRequest).pipe(
      catchError(error => {
        // Hata durumunda hata mesajını al ve yükleme durumunu kapat
        this.errorMessage = error.message || this.translate.instant('LOGIN_FAILED_GENERIC'); // Çevrilmiş hata mesajı
        this.isLoading = false;
        return of(null); // Observable'ı tamamla
      }),
      finalize(() => {
        this.isLoading = false; // İşlem tamamlandığında (başarılı veya hatalı) yüklemeyi bitir
      })
    ).subscribe(jwtResponse => {
      if (jwtResponse) {
        // Giriş başarılıysa token'ı ve kullanıcı bilgilerini kaydet
        this.tokenService.saveTokenAndUser(jwtResponse);
        // Kullanıcıyı ana sayfaya veya yönlendirilmek istenen URL'ye yönlendir
        this.router.navigate(['/home']); // Başarılı giriş sonrası profil sayfasına yönlendir
      }
    });
  }
}
