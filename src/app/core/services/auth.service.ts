// auth.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError, timer } from 'rxjs';
import { map, tap, catchError, switchMap, retry, shareReplay } from 'rxjs/operators';
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
import { ErrorService } from './error.service';

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

  // Token refresh işlemi için kontrol
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  constructor(
      private http: HttpClient,
      private tokenService: TokenService,
      private errorService: ErrorService,
      private router: Router
  ) {
    // Uygulama başladığında kullanıcı durumunu kontrol et
    this.initializeAuth();
  }

  /**
   * Uygulama başlangıcında authentication durumunu kontrol eder
   */
  private initializeAuth(): void {
    try {
      const token = this.tokenService.getAccessToken();
      if (token && this.tokenService.isTokenValid(token)) {
        const storedUser = this.tokenService.getStoredUser();
        if (storedUser) {
          this.currentUserSubject.next(storedUser);
          this.isAuthenticatedSubject.next(true);
          console.log('User authenticated from stored data');
        } else {
          // Token var ama user bilgisi yok, backend'den user bilgisini al
          this.loadCurrentUser().subscribe({
            next: () => console.log('User loaded from backend'),
            error: (error) => {
              console.error('Failed to load user from backend:', error);
              this.clearAuthState();
            }
          });
        }
      } else {
        this.clearAuthState();
      }
    } catch (error) {
      console.error('Error during auth initialization:', error);
      this.clearAuthState();
    }
  }

  /**
   * Kullanıcı girişi yapar
   */
  login(credentials: LoginRequest): Observable<JwtResponse> {
    if (!credentials.email || !credentials.password) {
      return throwError(() => ({
        message: 'E-posta ve şifre gereklidir',
        translationKey: 'AUTH_ERROR_MISSING_CREDENTIALS'
      }));
    }

    return this.http.post<JwtResponse>(`${this.apiUrl}/login`, credentials).pipe(
        tap(response => {
          console.log('Login successful, handling response');
          this.handleAuthResponse(response);
        }),
        catchError(error => this.handleAuthError(error)),
        shareReplay(1)
    );
  }

  /**
   * Yeni bir kullanıcı kaydı yapar
   */
  register(user: RegisterRequest): Observable<JwtResponse> {
    if (!user.email || !user.password || !user.firstName || !user.lastName) {
      return throwError(() => ({
        message: 'Tüm alanlar zorunludur',
        translationKey: 'AUTH_ERROR_MISSING_FIELDS'
      }));
    }

    return this.http.post<JwtResponse>(`${this.apiUrl}/register`, user).pipe(
        tap(response => {
          console.log('Registration successful, handling response');
          this.handleAuthResponse(response);
        }),
        catchError(error => this.handleAuthError(error)),
        shareReplay(1)
    );
  }

  /**
   * Kullanıcı çıkışı yapar
   */
  logout(): void {
    // Backend'e logout isteği gönder (opsiyonel)
    const refreshToken = this.tokenService.getRefreshToken();
    if (refreshToken) {
      this.http.post(`${this.apiUrl}/logout`, { refreshToken }).subscribe({
        next: () => console.log('Backend logout successful'),
        error: (error) => console.warn('Backend logout failed:', error)
      });
    }

    // Yerel state'i temizle
    this.clearAuthState();

    // Login sayfasına yönlendir
    this.router.navigate(['/auth/login']);
  }

  /**
   * Mevcut kullanıcı bilgilerini backend'den yükler
   */
  loadCurrentUser(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/me`).pipe(
        tap(user => {
          console.log('User loaded from backend:', user);
          this.currentUserSubject.next(user);
          this.isAuthenticatedSubject.next(true);

          // Storage'daki user bilgisini güncelle
          this.tokenService.updateStoredUser(user);
        }),
        catchError(error => {
          console.error('Failed to load current user:', error);
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
      // Zaten refresh işlemi yapılıyorsa, sonucunu bekle
      return this.refreshTokenSubject.pipe(
          switchMap(token => {
            if (token) {
              return of({
                accessToken: token,
                refreshToken: this.tokenService.getRefreshToken()!
              } as JwtResponse);
            } else {
              return throwError(() => new Error('Token refresh failed'));
            }
          })
      );
    }

    this.isRefreshing = true;
    this.refreshTokenSubject.next(null);

    const refreshToken = this.tokenService.getRefreshToken();

    if (!refreshToken) {
      this.isRefreshing = false;
      this.logout();
      return throwError(() => new Error('Refresh token bulunamadı'));
    }

    const request: RefreshTokenRequest = { refreshToken };

    return this.http.post<JwtResponse>(`${this.apiUrl}/refresh`, request).pipe(
        tap(response => {
          console.log('Token refresh successful');
          this.handleAuthResponse(response);
          this.isRefreshing = false;
          this.refreshTokenSubject.next(response.accessToken);
        }),
        catchError(error => {
          console.error('Token refresh failed:', error);
          this.isRefreshing = false;
          this.refreshTokenSubject.next(null);
          this.logout();
          return throwError(() => error);
        }),
        shareReplay(1)
    );
  }

  /**
   * Şifre değiştirme
   */
  changePassword(request: ChangePasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/change-password`, request).pipe(
        catchError(error => this.errorService.handleError(error))
    );
  }

  /**
   * Şifre sıfırlama isteği gönder
   */
  requestPasswordReset(email: string): Observable<void> {
    if (!email) {
      return throwError(() => new Error('E-posta adresi gereklidir'));
    }

    return this.http.post<void>(`${this.apiUrl}/forgot-password`, { email }).pipe(
        catchError(error => this.errorService.handleError(error))
    );
  }

  /**
   * Şifreyi sıfırla
   */
  resetPassword(request: ResetPasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/reset-password`, request).pipe(
        catchError(error => this.errorService.handleError(error))
    );
  }

  /**
   * E-posta doğrulama
   */
  verifyEmail(token: string): Observable<void> {
    if (!token) {
      return throwError(() => new Error('Doğrulama token\'ı gereklidir'));
    }

    return this.http.post<void>(`${this.apiUrl}/verify-email`, { token }).pipe(
        tap(() => {
          // E-posta doğrulandıktan sonra user bilgisini güncelle
          const currentUser = this.currentUserSubject.value;
          if (currentUser) {
            const updatedUser = { ...currentUser, isEmailVerified: true };
            this.currentUserSubject.next(updatedUser);
            this.tokenService.updateStoredUser({ isEmailVerified: true });
          }
        }),
        catchError(error => this.errorService.handleError(error))
    );
  }

  /**
   * E-posta doğrulama kodunu tekrar gönder
   */
  resendVerificationEmail(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/resend-verification`, {}).pipe(
        catchError(error => this.errorService.handleError(error))
    );
  }

  /**
   * Auth response'unu handle eder
   */
  private handleAuthResponse(response: JwtResponse): void {
    try {
      if (!response || !response.accessToken) {
        throw new Error('Invalid auth response: missing access token');
      }

      console.log('Handling auth response');

      // Token'ları sakla (rememberMe default true)
      this.tokenService.saveTokens(
          response.accessToken,
          response.refreshToken || '',
          true
      );

      // Token'dan kullanıcı bilgilerini çıkar
      const payload = this.tokenService.decodeToken(response.accessToken);
      if (payload) {
        const userProfile: UserProfile = {
          id: payload.sub,
          email: payload.email || '',
          firstName: payload.firstName || '',
          lastName: payload.lastName || '',
          role: payload.role || 'USER',
          isEmailVerified: payload.isEmailVerified || false,
          createdAt: payload.createdAt || new Date().toISOString()
        };

        console.log('Setting user profile:', userProfile);
        this.currentUserSubject.next(userProfile);
        this.isAuthenticatedSubject.next(true);
      } else {
        console.error('Failed to decode token payload');
        throw new Error('Invalid token payload');
      }
    } catch (error) {
      console.error('Error handling auth response:', error);
      this.clearAuthState();
      throw error;
    }
  }

  /**
   * Auth hatalarını handle eder
   */
  private handleAuthError(error: HttpErrorResponse): Observable<never> {
    console.error('Auth error occurred:', error);

    let errorMessage = 'Bilinmeyen bir hata oluştu';
    let translationKey = 'AUTH_ERROR_GENERIC';

    // Network hatası
    if (error.status === 0) {
      errorMessage = 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.';
      translationKey = 'AUTH_ERROR_NETWORK';
    }
    // Unauthorized
    else if (error.status === 401) {
      if (error.error?.message) {
        errorMessage = error.error.message;
      } else {
        errorMessage = 'E-posta veya şifre hatalı.';
      }
      translationKey = 'AUTH_ERROR_INVALID_CREDENTIALS';
    }
    // Conflict (user already exists)
    else if (error.status === 409) {
      errorMessage = 'Bu e-posta adresi zaten kayıtlı.';
      translationKey = 'AUTH_ERROR_USER_EXISTS';
    }
    // Bad Request
    else if (error.status === 400) {
      errorMessage = error.error?.message || 'Geçersiz istek.';
      translationKey = 'AUTH_ERROR_BAD_REQUEST';
    }
    // Validation Error
    else if (error.status === 422) {
      errorMessage = error.error?.message || 'Gönderilen veriler geçersiz.';
      translationKey = 'AUTH_ERROR_VALIDATION';
    }
    // Server Error
    else if (error.status >= 500) {
      errorMessage = 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
      translationKey = 'AUTH_ERROR_SERVER';
    }
    // Other errors
    else if (error.error?.message) {
      errorMessage = error.error.message;
    }

    return throwError(() => ({
      ...error,
      message: errorMessage,
      translationKey: translationKey,
      timestamp: new Date()
    }));
  }

  /**
   * Auth state'ini temizler
   */
  private clearAuthState(): void {
    console.log('Clearing auth state');
    this.tokenService.clearTokens();
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.isRefreshing = false;
    this.refreshTokenSubject.next(null);
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
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });
  }

  /**
   * Token'ın yakında expire olup olmayacağını kontrol eder
   */
  isTokenExpiringSoon(): boolean {
    const timeUntilExpiry = this.tokenService.getTimeUntilExpiry();
    const fiveMinutes = 5 * 60 * 1000; // 5 dakika
    return timeUntilExpiry > 0 && timeUntilExpiry < fiveMinutes;
  }

  /**
   * Kullanıcı profilini günceller
   */
  updateProfile(updates: Partial<UserProfile>): void {
    const currentUser = this.currentUserSubject.value;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates };
      this.currentUserSubject.next(updatedUser);
      this.tokenService.updateStoredUser(updates);
    }
  }
  }