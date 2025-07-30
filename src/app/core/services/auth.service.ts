// auth.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, tap, catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';

// Models
import {
  LoginRequest,
  JwtResponse,
  RegisterRequest,
  UserProfile,
  ChangePasswordRequest,
  ResetPasswordRequest,
  RefreshTokenRequest
} from '../../features/auth/models/auth.models';

// Environment
import { environment } from '../../../environments/environment';

// Services
import { TokenService } from './token.service';

// AuthService, kullanıcı kimlik doğrulama, kayıt ve oturum yönetimi işlemlerini yönetir.
// Backend API'si ile iletişim kurarak JWT token'ları alır, saklar ve kullanıcı durumunu yönetir.
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;

  // Kullanıcı durumu için BehaviorSubject - reaktif state yönetimi
  private currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  // Login durumu için BehaviorSubject
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  // Token refresh işlemi için flag
  private isRefreshing = false;

  constructor(
      private http: HttpClient,
      private tokenService: TokenService,
      private router: Router
  ) {
    // Uygulama başladığında kullanıcı durumunu kontrol et
    this.initializeAuth();
  }

  /**
   * Uygulama başlangıcında authentication durumunu kontrol eder
   */
  private initializeAuth(): void {
    const token = this.tokenService.getAccessToken();
    if (token && this.tokenService.isTokenValid()) {
      this.loadCurrentUser().subscribe({
        next: () => console.log('Kullanıcı bilgileri yüklendi'),
        error: () => {
          console.error('Kullanıcı bilgileri yüklenemedi, oturum sonlandırılıyor');
          this.logout();
        }
      });
    } else {
      this.clearAuthState();
    }
  }

  /**
   * Kullanıcı girişi yapar
   * @param credentials Kullanıcının e-posta ve şifresini içeren LoginRequest nesnesi
   * @returns Backend'den dönen JwtResponse nesnesini içeren Observable
   */
  login(credentials: LoginRequest): Observable<JwtResponse> {
    return this.http.post<JwtResponse>(`${this.apiUrl}/login`, credentials).pipe(
        tap(response => this.handleAuthResponse(response)),
        catchError(error => this.handleAuthError(error))
    );
  }

  /**
   * Yeni bir kullanıcı kaydı yapar
   * @param user Kaydedilecek kullanıcının bilgilerini içeren RegisterRequest nesnesi
   * @returns Backend'den dönen JwtResponse nesnesini içeren Observable
   */
  register(user: RegisterRequest): Observable<JwtResponse> {
    return this.http.post<JwtResponse>(`${this.apiUrl}/register`, user).pipe(
        tap(response => this.handleAuthResponse(response)),
        catchError(error => this.handleAuthError(error))
    );
  }

  /**
   * Kullanıcı çıkışı yapar
   */
  logout(): void {
    // Backend'e logout isteği gönder (opsiyonel - server-side session varsa)
    this.http.post(`${this.apiUrl}/logout`, {}).subscribe({
      complete: () => console.log('Sunucu tarafında oturum kapatıldı'),
      error: () => console.warn('Sunucu logout başarısız, yerel oturum kapatılıyor')
    });

    // Yerel state'i temizle
    this.clearAuthState();

    // Login sayfasına yönlendir
    this.router.navigate(['/auth/login']);
  }

  /**
   * Mevcut kullanıcı bilgilerini yükler
   */
  loadCurrentUser(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/me`).pipe(
        tap(user => {
          this.currentUserSubject.next(user);
          this.isAuthenticatedSubject.next(true);
        }),
        catchError(error => {
          this.clearAuthState();
          return throwError(() => error);
        })
    );
  }

  /**
   * Access token'ı yeniler
   */
  refreshToken(): Observable<JwtResponse> {
    if (this.isRefreshing) {
      // Zaten refresh işlemi yapılıyorsa bekle
      return this.waitForTokenRefresh();
    }

    this.isRefreshing = true;
    const refreshToken = this.tokenService.getRefreshToken();

    if (!refreshToken) {
      this.isRefreshing = false;
      this.logout();
      return throwError(() => new Error('Refresh token bulunamadı'));
    }

    const request: RefreshTokenRequest = { refreshToken };

    return this.http.post<JwtResponse>(`${this.apiUrl}/refresh`, request).pipe(
        tap(response => {
          this.handleAuthResponse(response);
          this.isRefreshing = false;
        }),
        catchError(error => {
          this.isRefreshing = false;
          this.logout();
          return throwError(() => error);
        })
    );
  }

  /**
   * Token refresh işleminin tamamlanmasını bekler
   */
  private waitForTokenRefresh(): Observable<JwtResponse> {
    return new Observable(observer => {
      const checkInterval = setInterval(() => {
        if (!this.isRefreshing) {
          clearInterval(checkInterval);
          const token = this.tokenService.getAccessToken();
          if (token) {
            observer.next({ accessToken: token, refreshToken: this.tokenService.getRefreshToken()! } as JwtResponse);
            observer.complete();
          } else {
            observer.error(new Error('Token refresh başarısız'));
          }
        }
      }, 100);
    });
  }

  /**
   * Şifre değiştirme
   */
  changePassword(request: ChangePasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/change-password`, request);
  }

  /**
   * Şifre sıfırlama isteği gönder
   */
  requestPasswordReset(email: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/forgot-password`, { email });
  }

  /**
   * Şifreyi sıfırla
   */
  resetPassword(request: ResetPasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/reset-password`, request);
  }

  /**
   * E-posta doğrulama
   */
  verifyEmail(token: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/verify-email`, { token });
  }

  /**
   * E-posta doğrulama kodunu tekrar gönder
   */
  resendVerificationEmail(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/resend-verification`, {});
  }

  /**
   * Auth response'unu handle eder
   */
  private handleAuthResponse(response: JwtResponse): void {
    // Token'ları sakla
    this.tokenService.saveTokens(response.accessToken, response.refreshToken);

    // Token'dan kullanıcı bilgilerini çıkar
    const payload = this.tokenService.decodeToken(response.accessToken);
    if (payload) {
      const userProfile: UserProfile = {
        id: payload.sub,
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        role: payload.role,
        isEmailVerified: payload.isEmailVerified || false,
        createdAt: payload.createdAt || new Date().toISOString()
      };

      this.currentUserSubject.next(userProfile);
      this.isAuthenticatedSubject.next(true);
    }
  }

  /**
   * Auth hatalarını handle eder
   */
  private handleAuthError(error: any): Observable<never> {
    let errorMessage = 'AUTH_ERROR_GENERIC';

    if (error.status === 401) {
      errorMessage = 'AUTH_ERROR_INVALID_CREDENTIALS';
    } else if (error.status === 409) {
      errorMessage = 'AUTH_ERROR_USER_EXISTS';
    } else if (error.status === 400) {
      errorMessage = error.error?.message || 'AUTH_ERROR_BAD_REQUEST';
    } else if (error.status === 0) {
      errorMessage = 'AUTH_ERROR_NETWORK';
    }

    return throwError(() => ({ ...error, translationKey: errorMessage }));
  }

  /**
   * Auth state'ini temizler
   */
  private clearAuthState(): void {
    this.tokenService.clearTokens();
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  // ========== Getter Methods ==========

  /**
   * Mevcut kullanıcıyı döndürür
   */
  getCurrentUser(): Observable<UserProfile | null> {
    return this.currentUser$;
  }

  /**
   * Mevcut kullanıcının snapshot'ını döndürür
   */
  getCurrentUserSnapshot(): UserProfile | null {
    return this.currentUserSubject.value;
  }

  /**
   * Kullanıcının giriş yapıp yapmadığını kontrol eder
   */
  isLoggedIn(): boolean {
    return this.isAuthenticatedSubject.value && this.tokenService.isTokenValid();
  }

  /**
   * Kullanıcının belirli bir role sahip olup olmadığını kontrol eder
   */
  hasRole(role: string): boolean {
    const currentUser = this.currentUserSubject.value;
    return currentUser?.role === role;
  }

  /**
   * Kullanıcının birden fazla rolden birine sahip olup olmadığını kontrol eder
   */
  hasAnyRole(roles: string[]): boolean {
    const currentUser = this.currentUserSubject.value;
    return currentUser ? roles.includes(currentUser.role) : false;
  }

  /**
   * Kullanıcının e-posta doğrulaması yapıp yapmadığını kontrol eder
   */
  isEmailVerified(): boolean {
    const currentUser = this.currentUserSubject.value;
    return currentUser?.isEmailVerified || false;
  }

  /**
   * Authorization header'ını oluşturur
   */
  getAuthorizationHeader(): HttpHeaders {
    const token = this.tokenService.getAccessToken();
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }
}