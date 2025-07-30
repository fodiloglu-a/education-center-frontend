// token.service.ts

import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { TokenPayload, UserProfile } from '../../features/auth/models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  // Token ve kullanıcı bilgileri için storage key'leri
  private readonly ACCESS_TOKEN_KEY = 'auth-access-token';
  private readonly REFRESH_TOKEN_KEY = 'auth-refresh-token';
  private readonly USER_KEY = 'auth-user';
  private readonly REMEMBER_ME_KEY = 'auth-remember-me';

  // Token expiry kontrolü için buffer süresi (5 dakika)
  private readonly TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000;

  // BehaviorSubject'ler - reaktif state yönetimi
  private _isLoggedIn$ = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this._isLoggedIn$.asObservable();

  private _userRole$ = new BehaviorSubject<string | null>(null);
  public userRole$ = this._userRole$.asObservable();

  private _tokenExpiry$ = new BehaviorSubject<Date | null>(null);
  public tokenExpiry$ = this._tokenExpiry$.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    // Uygulama başladığında ilk durumu kontrol et
    if (isPlatformBrowser(this.platformId)) {
      this.initializeTokenState();
    }
  }

  /**
   * Token durumunu başlatır
   */
  private initializeTokenState(): void {
    const token = this.getAccessToken();
    if (token && this.isTokenValid(token)) {
      const user = this.getStoredUser();
      if (user) {
        this._isLoggedIn$.next(true);
        this._userRole$.next(user.role);

        // Token expiry zamanını hesapla
        const payload = this.decodeToken(token);
        if (payload?.exp) {
          this._tokenExpiry$.next(new Date(payload.exp * 1000));
        }
      }
    } else {
      // Token geçersizse temizle
      this.clearTokens();
    }
  }

  /**
   * Storage'a veri yazar
   */
  private setStorageItem(key: string, value: string, useSessionStorage: boolean = false): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const storage = useSessionStorage ? window.sessionStorage : window.localStorage;
        storage.setItem(key, value);
      } catch (error) {
        console.error('Storage write error:', error);
      }
    }
  }

  /**
   * Storage'dan veri okur
   */
  private getStorageItem(key: string): string | null {
    if (isPlatformBrowser(this.platformId)) {
      try {
        // Önce localStorage'ı kontrol et, yoksa sessionStorage'a bak
        return window.localStorage.getItem(key) || window.sessionStorage.getItem(key);
      } catch (error) {
        console.error('Storage read error:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Storage'dan veri siler
   */
  private removeStorageItem(key: string): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        window.localStorage.removeItem(key);
        window.sessionStorage.removeItem(key);
      } catch (error) {
        console.error('Storage remove error:', error);
      }
    }
  }

  /**
   * Token'ları ve kullanıcı bilgilerini saklar
   */
  public saveTokens(accessToken: string, refreshToken: string, rememberMe: boolean = true): void {
    if (!accessToken) {
      console.error('TokenService: Access token is required');
      return;
    }

    if (isPlatformBrowser(this.platformId)) {
      // Remember me tercihine göre storage tipini belirle
      const useSessionStorage = !rememberMe;

      this.setStorageItem(this.ACCESS_TOKEN_KEY, accessToken, useSessionStorage);

      if (refreshToken) {
        this.setStorageItem(this.REFRESH_TOKEN_KEY, refreshToken, useSessionStorage);
      }

      this.setStorageItem(this.REMEMBER_ME_KEY, rememberMe.toString(), false);

      // Token'dan kullanıcı bilgilerini çıkar ve sakla
      const payload = this.decodeToken(accessToken);
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

        this.setStorageItem(this.USER_KEY, JSON.stringify(userProfile), useSessionStorage);

        // State'i güncelle
        this._isLoggedIn$.next(true);
        this._userRole$.next(userProfile.role);

        if (payload.exp) {
          this._tokenExpiry$.next(new Date(payload.exp * 1000));
        }
      }
    }
  }

  /**
   * Access token'ı döndürür
   */
  public getAccessToken(): string | null {
    return this.getStorageItem(this.ACCESS_TOKEN_KEY);
  }

  /**
   * Refresh token'ı döndürür
   */
  public getRefreshToken(): string | null {
    return this.getStorageItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Saklanan kullanıcı bilgilerini döndürür
   */
  public getStoredUser(): UserProfile | null {
    const userJson = this.getStorageItem(this.USER_KEY);
    if (userJson) {
      try {
        return JSON.parse(userJson);
      } catch (e) {
        console.error('Failed to parse user data from storage', e);
        return null;
      }
    }
    return null;
  }

  /**
   * JWT token'ı decode eder
   */
  public decodeToken(token: string | null): TokenPayload | null {
    if (!token) {
      console.warn('Attempted to decode a null or undefined token.');
      return null;
    }

    try {
      // Token'ı parçalara ayır
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.error('Invalid JWT token format');
        return null;
      }

      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

      // Base64 padding ekle
      const padLen = (4 - base64.length % 4) % 4;
      const paddedBase64 = base64 + '='.repeat(padLen);

      const jsonPayload = decodeURIComponent(
          atob(paddedBase64)
              .split('')
              .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
      );

      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Token'ın geçerli olup olmadığını kontrol eder
   */
  public isTokenValid(token?: string | null): boolean {
    const tokenToCheck = token || this.getAccessToken();

    if (!tokenToCheck) {
      return false;
    }

    const payload = this.decodeToken(tokenToCheck);
    if (!payload || !payload.exp) {
      return false;
    }

    // Token expiry kontrolü (buffer süresi ile)
    const expiryTime = payload.exp * 1000;
    const currentTime = new Date().getTime();

    return expiryTime > (currentTime + this.TOKEN_EXPIRY_BUFFER);
  }

  /**
   * Token'ın ne zaman expire olacağını döndürür
   */
  public getTokenExpiryTime(): Date | null {
    const token = this.getAccessToken();
    if (!token) return null;

    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) return null;

    return new Date(payload.exp * 1000);
  }

  /**
   * Token'ın expire olmasına kalan süreyi milisaniye cinsinden döndürür
   */
  public getTimeUntilExpiry(): number {
    const expiryTime = this.getTokenExpiryTime();
    if (!expiryTime) return 0;

    const timeUntilExpiry = expiryTime.getTime() - new Date().getTime();
    return Math.max(0, timeUntilExpiry);
  }

  /**
   * Kullanıcının giriş yapıp yapmadığını kontrol eder
   */
  public isLoggedIn(): boolean {
    return this._isLoggedIn$.getValue() && this.isTokenValid();
  }

  /**
   * Kullanıcının belirli bir role sahip olup olmadığını kontrol eder
   */
  public hasRole(role: string): boolean {
    const currentUserRole = this._userRole$.getValue();
    return currentUserRole === role;
  }

  /**
   * Kullanıcının birden fazla rolden birine sahip olup olmadığını kontrol eder
   */
  public hasAnyRole(roles: string[]): boolean {
    const currentRole = this._userRole$.getValue();
    return currentRole ? roles.includes(currentRole) : false;
  }

  /**
   * Remember me tercihini döndürür
   */
  public isRememberMe(): boolean {
    const rememberMe = this.getStorageItem(this.REMEMBER_ME_KEY);
    return rememberMe === 'true';
  }

  /**
   * Kullanıcı bilgilerini günceller (profile güncellemeleri için)
   */
  public updateStoredUser(updates: Partial<UserProfile>): void {
    const currentUser = this.getStoredUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates };
      const useSessionStorage = !this.isRememberMe();
      this.setStorageItem(this.USER_KEY, JSON.stringify(updatedUser), useSessionStorage);

      // Rol değiştiyse state'i güncelle
      if (updates.role && updates.role !== currentUser.role) {
        this._userRole$.next(updates.role);
      }
    }
  }

  /**
   * Tüm token ve kullanıcı bilgilerini temizler (logout için)
   */
  public clearTokens(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Storage'ı temizle
      this.removeStorageItem(this.ACCESS_TOKEN_KEY);
      this.removeStorageItem(this.REFRESH_TOKEN_KEY);
      this.removeStorageItem(this.USER_KEY);
      this.removeStorageItem(this.REMEMBER_ME_KEY);

      // State'i sıfırla
      this._isLoggedIn$.next(false);
      this._userRole$.next(null);
      this._tokenExpiry$.next(null);
    }
  }

  /**
   * signOut metodu - clearTokens'ın alias'ı (geriye dönük uyumluluk için)
   */
  public signOut(): void {
    this.clearTokens();
  }

  /**
   * getUser metodu - getStoredUser'ın basitleştirilmiş versiyonu (geriye dönük uyumluluk için)
   */
  public getUser(): { id: number; email: string; firstName: string; lastName: string; role: string } | null {
    const user = this.getStoredUser();
    if (user) {
      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      };
    }
    return null;
  }

  /**
   * saveTokenAndUser metodu - eski JwtResponse formatı ile uyumluluk için
   */
  public saveTokenAndUser(jwtResponse: any): void {
    if (!jwtResponse || !jwtResponse.accessToken) {
      console.error('TokenService: JWT Response or accessToken is null/undefined. Not saving.');
      return;
    }

    if (isPlatformBrowser(this.platformId)) {
      const rememberMe = this.isRememberMe();
      const useSessionStorage = !rememberMe;

      this.setStorageItem(this.ACCESS_TOKEN_KEY, jwtResponse.accessToken, useSessionStorage);

      if (jwtResponse.refreshToken) {
        this.setStorageItem(this.REFRESH_TOKEN_KEY, jwtResponse.refreshToken, useSessionStorage);
      }

      const userToStore = {
        id: jwtResponse.id || 0,
        email: jwtResponse.email || '',
        firstName: jwtResponse.firstName || '',
        lastName: jwtResponse.lastName || '',
        role: jwtResponse.role || 'USER',
        isEmailVerified: jwtResponse.isEmailVerified || false,
        createdAt: jwtResponse.createdAt || new Date().toISOString()
      };

      this.setStorageItem(this.USER_KEY, JSON.stringify(userToStore), useSessionStorage);

      this._isLoggedIn$.next(true);
      this._userRole$.next(userToStore.role);

      const payload = this.decodeToken(jwtResponse.accessToken);
      if (payload?.exp) {
        this._tokenExpiry$.next(new Date(payload.exp * 1000));
      }
    }
  }

  /**
   * getToken metodu - getAccessToken'ın alias'ı (geriye dönük uyumluluk için)
   */
  public getToken(): string | null {
    return this.getAccessToken();
  }

  /**
   * Token yenileme için mevcut token'ları geçici olarak saklar
   */
  public backupTokens(): { accessToken: string | null; refreshToken: string | null } {
    return {
      accessToken: this.getAccessToken(),
      refreshToken: this.getRefreshToken()
    };
  }

  /**
   * Token yenileme başarısız olursa eski token'ları geri yükler
   */
  public restoreTokens(backup: { accessToken: string | null; refreshToken: string | null }): void {
    if (backup.accessToken && backup.refreshToken) {
      const rememberMe = this.isRememberMe();
      this.saveTokens(backup.accessToken, backup.refreshToken, rememberMe);
    }
  }
}