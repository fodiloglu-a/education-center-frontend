// auth.interceptor.ts

import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core'; // inject fonksiyonunu import ediyoruz
import { TokenService } from '../services/token.service'; // TokenService'i import ediyoruz

// AuthInterceptor, giden HTTP isteklerine JWT token'ını otomatik olarak ekleyen fonksiyonel bir interceptor'dır.
// Bu, korumalı backend API'lerine erişim için gereklidir.
export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService); // TokenService'i inject ediyoruz

  const token = tokenService.getToken(); // TokenService'den JWT token'ını alır

  // Eğer token varsa ve istek bizim API URL'mize gidiyorsa (veya belirli bir desene uyuyorsa)
  // token'ı Authorization başlığına ekle.
  // Backend API'mizin 'http://localhost:8080/api' olduğunu varsayıyoruz.
  // Auth endpoint'leri (login, register) için token göndermeye gerek yoktur.
  if (token && !req.url.includes('/auth/')) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}` // 'Bearer ' ön eki ile token'ı Authorization başlığına ekler
      }
    });
  }

  return next(req); // Düzeltilen satır: HttpHandlerFn doğrudan çağrılır, .handle() metodu kullanılmaz
};
