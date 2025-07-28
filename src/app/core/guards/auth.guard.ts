// auth.guard.ts

import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { TokenService } from '../services/token.service'; // TokenService'i import ediyoruz

// AuthGuard, kullanıcının oturum açmış olup olmadığını kontrol ederek korumalı rotalara erişimi yönetir.
// Eğer kullanıcı oturum açmamışsa, onu giriş sayfasına yönlendirir.
@Injectable({
  providedIn: 'root' // Bu guard'ın uygulamanın kök seviyesinde (singleton) sağlanacağını belirtir.
})
export class AuthGuard implements CanActivate {

  constructor(private tokenService: TokenService, private router: Router) {}

  /**
   * Bir rotaya erişilip erişilemeyeceğini belirler.
   * @param route Aktif rota snapshot'ı.
   * @param state Router'ın mevcut durumu.
   * @returns Rotaya erişilebilirse true, aksi takdirde UrlTree (yönlendirme) veya Observable<boolean | UrlTree>.
   */
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    if (this.tokenService.isLoggedIn()) {
      // Kullanıcı oturum açmışsa, rotaya erişime izin ver.
      return true;
    } else {
      // Kullanıcı oturum açmamışsa, onu giriş sayfasına yönlendir.
      // Yönlendirme sonrası orijinal URL'yi query parametresi olarak ekleyebiliriz,
      // böylece giriş yaptıktan sonra o sayfaya geri dönebilir.
      return this.router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
    }
  }
}
