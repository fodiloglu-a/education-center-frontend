// role.guard.ts

import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { TokenService } from '../services/token.service'; // TokenService'i import ediyoruz

// RoleGuard, kullanıcının belirli bir role sahip olup olmadığını kontrol ederek rotalara erişimi yönetir.
// Eğer kullanıcı gerekli role sahip değilse, onu yetkisiz erişim sayfasına veya ana sayfaya yönlendirir.
@Injectable({
  providedIn: 'root' // Bu guard'ın uygulamanın kök seviyesinde (singleton) sağlanacağını belirtir.
})
export class RoleGuard implements CanActivate {

  constructor(private tokenService: TokenService, private router: Router) {}

  /**
   * Bir rotaya erişilip erişilemeyeceğini belirler, kullanıcının rolüne göre.
   * @param route Aktif rota snapshot'ı. Rota tanımında 'data: { roles: ['ROLE_ADMIN'] }' şeklinde roller belirtilebilir.
   * @param state Router'ın mevcut durumu.
   * @returns Rotaya erişilebilirse true, aksi takdirde UrlTree (yönlendirme) veya Observable<boolean | UrlTree>.
   */
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    // Rota tanımından beklenen rolleri al
    const expectedRoles = route.data['roles'] as string[];

    // Kullanıcı oturum açmamışsa, AuthGuard zaten yönlendirme yapacaktır.
    // Ancak yine de burada bir kontrol ekleyebiliriz.
    if (!this.tokenService.isLoggedIn()) {
      return this.router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
    }

    // Kullanıcının rolünü al
    const currentUser = this.tokenService.getUser();
    if (currentUser && expectedRoles && expectedRoles.length > 0) {
      // Kullanıcının beklenen rollerden herhangi birine sahip olup olmadığını kontrol et
      const hasRequiredRole = expectedRoles.some(role => this.tokenService.hasRole(role));

      if (hasRequiredRole) {
        return true; // Gerekli role sahipse erişime izin ver
      } else {
        // Gerekli role sahip değilse, yetkisiz erişim sayfasına veya ana sayfaya yönlendir.
        // Şimdilik ana sayfaya yönlendiriyoruz.
        console.warn(`User ${currentUser.email} does not have required roles: ${expectedRoles.join(', ')}`);
        return this.router.createUrlTree(['/']); // Ana sayfaya yönlendir
      }
    }

    // Rol bilgisi yoksa veya beklenmedik bir durumsa erişime izin verme
    console.warn('RoleGuard: User or expected roles not found.');
    return false;
  }
}
