// auth.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LoginRequest, JwtResponse, RegisterRequest } from '../../features/auth/models/auth.models'; // Auth modellerini import ediyoruz
import { environment } from '../../../environments/environment'; // Ortam değişkenlerini import ediyoruz

// AuthService, kullanıcı kimlik doğrulama (login) ve kayıt (register) işlemlerini yönetir.
// Backend API'si ile iletişim kurarak JWT token'ları alır ve döndürür.
@Injectable({
  providedIn: 'root' // Bu servisin uygulamanın kök seviyesinde (singleton) sağlanacağını belirtir.
  // Bu, uygulamanın herhangi bir yerinden erişilebilir olmasını sağlar.
})
export class AuthService {
  private apiUrl = environment.apiUrl; // Backend API URL'sini ortam değişkenlerinden alıyoruz

  constructor(private http: HttpClient) { }

  /**
   * Kullanıcı girişi yapar.
   * @param credentials Kullanıcının e-posta ve şifresini içeren LoginRequest nesnesi.
   * @returns Backend'den dönen JwtResponse nesnesini içeren Observable.
   */
  login(credentials: LoginRequest): Observable<JwtResponse> {
    // Backend'deki /api/auth/login endpoint'ine POST isteği gönderir.
    return this.http.post<JwtResponse>(`${this.apiUrl}/auth/login`, credentials);
  }

  /**
   * Yeni bir kullanıcı kaydı yapar.
   * @param user Kaydedilecek kullanıcının bilgilerini içeren RegisterRequest nesnesi.
   * @returns Backend'den dönen JwtResponse nesnesini içeren Observable.
   */
  register(user: RegisterRequest): Observable<JwtResponse> {
    // Backend'deki /api/auth/register endpoint'ine POST isteği gönderir.
    return this.http.post<JwtResponse>(`${this.apiUrl}/auth/register`, user);
  }

  // Not: JWT token'ının saklanması ve yönetimi TokenService'de yapılacaktır.
  // Kullanıcının oturum açma durumu ve rol bilgileri TokenService üzerinden kontrol edilebilir.
}
