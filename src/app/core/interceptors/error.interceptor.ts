// error.interceptor.ts

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core'; // inject fonksiyonunu import ediyoruz
import { catchError } from 'rxjs/operators'; // Hataları yakalamak için
import { ErrorService } from '../services/error.service'; // ErrorService'i import ediyoruz
import { TokenService } from '../services/token.service'; // TokenService'i import ediyoruz (401 hataları için)
import { Router } from '@angular/router'; // Yönlendirme için
import { throwError } from 'rxjs'; // Hata fırlatmak için

// ErrorInterceptor, HTTP isteklerinden dönen hataları yakalar ve işleyen fonksiyonel bir interceptor'dır.
// Özellikle 401 (Unauthorized) hatalarında kullanıcıyı giriş sayfasına yönlendirebilir.
export const ErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorService = inject(ErrorService); // ErrorService'i inject ediyoruz
  const tokenService = inject(TokenService); // TokenService'i inject ediyoruz
  const router = inject(Router); // Router'ı inject ediyoruz

  return next(req).pipe( // Düzeltilen satır: HttpHandlerFn doğrudan çağrılır, .handle() metodu kullanılmaz
    catchError((error: HttpErrorResponse) => {
      // Eğer hata 401 (Unauthorized) ise ve kullanıcı login veya register sayfasında değilse
      // token'ı temizle ve kullanıcıyı giriş sayfasına yönlendir.
      if (error.status === 401 && !req.url.includes('/auth/')) {
        tokenService.signOut(); // Token'ı ve kullanıcı bilgilerini temizle
        router.navigate(['/auth/login']); // Giriş sayfasına yönlendir
      }
      // Hatanın geri kalanını ErrorService'e ilet ve yeniden fırlat.
      return errorService.handleError(error);
    })
  );
};
