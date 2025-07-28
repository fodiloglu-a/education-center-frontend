// token.service.ts

import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { JwtResponse } from '../../features/auth/models/auth.models';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private readonly TOKEN_KEY = 'auth-token';
  private readonly USER_KEY = 'auth-user';

  // BehaviorSubject'leri başlangıçta varsayılan güvenli değerlerle başlat
  private _isLoggedIn$ = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this._isLoggedIn$.asObservable();

  private _userRole$ = new BehaviorSubject<string | null>(null);
  public userRole$ = this._userRole$.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    // Uygulama başladığında ilk durumu sadece tarayıcıda kontrol et
    if (isPlatformBrowser(this.platformId)) {
      this._isLoggedIn$.next(this.checkInitialLoginStatus());
      this._userRole$.next(this.getInitialUserRole());
    }
  }

  private checkInitialLoginStatus(): boolean {
    return !!this.getRawItem(this.TOKEN_KEY) && !!this.getRawItem(this.USER_KEY);
  }

  private getInitialUserRole(): string | null {
    const user = this.getRawItem(this.USER_KEY);
    if (user) {
      try {
        const parsedUser = JSON.parse(user);
        return parsedUser.role;
      } catch (e) {
        console.error('Failed to parse user data from localStorage', e);
        return null;
      }
    }
    return null;
  }

  private setRawItem(key: string, value: string): void {
    if (isPlatformBrowser(this.platformId)) {
      window.localStorage.setItem(key, value);
    }
  }

  private getRawItem(key: string): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return window.localStorage.getItem(key);
    }
    return null;
  }

  public saveTokenAndUser(jwtResponse: JwtResponse): void {
    if (!jwtResponse || !jwtResponse.token) {
      console.error('TokenService: JWT Response or token is null/undefined. Not saving.');
      return;
    }

    if (isPlatformBrowser(this.platformId)) {
      this.setRawItem(this.TOKEN_KEY, jwtResponse.token);

      const userToStore = {
        id: jwtResponse.id,
        email: jwtResponse.email,
        firstName: jwtResponse.firstName,
        lastName: jwtResponse.lastName,
        role: jwtResponse.role
      };
      this.setRawItem(this.USER_KEY, JSON.stringify(userToStore));

      this._isLoggedIn$.next(true);
      this._userRole$.next(userToStore.role);
    }
  }

  public getToken(): string | null {
    return this.getRawItem(this.TOKEN_KEY);
  }

  public getUser(): { id: number; email: string; firstName: string; lastName: string; role: string } | null {
    const user = this.getRawItem(this.USER_KEY);
    if (user) {
      try {
        return JSON.parse(user);
      } catch (e) {
        console.error('Failed to parse user data from localStorage', e);
        return null;
      }
    }
    return null;
  }

  public isLoggedIn(): boolean {
    return this._isLoggedIn$.getValue();
  }

  public hasRole(role: string): boolean {
    return this._userRole$.getValue() === role;
  }

  public signOut(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.localStorage.removeItem(this.TOKEN_KEY);
      window.localStorage.removeItem(this.USER_KEY);
      this._isLoggedIn$.next(false);
      this._userRole$.next(null);
    }
  }
}
