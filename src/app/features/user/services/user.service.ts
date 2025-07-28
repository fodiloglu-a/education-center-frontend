// user.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserResponse, UserUpdateRequest, PasswordChangeRequest } from '../models/user.models'; // Kullanıcı modellerini import ediyoruz
import { environment } from '../../../../environments/environment'; // Ortam değişkenlerini import ediyoruz

// UserService, kullanıcı profili ve yönetimi ile ilgili backend API çağrılarını yönetir.
// Kullanıcı bilgilerini getirme, güncelleme ve şifre değiştirme gibi işlemleri kapsar.
@Injectable({
  providedIn: 'root' // Bu servisin uygulamanın kök seviyesinde (singleton) sağlanacağını belirtir.
})
export class UserService {
  private apiUrl = environment.apiUrl; // Backend API URL'sini ortam değişkenlerinden alıyoruz

  constructor(private http: HttpClient) { }

  /**
   * Belirli bir ID'ye sahip kullanıcıyı getirir.
   * @param id Kullanıcının ID'si.
   * @returns Kullanıcı bilgilerini içeren UserResponse nesnesini içeren Observable.
   */
  getUserById(id: number): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.apiUrl}/users/${id}`);
  }

  /**
   * Tüm kullanıcıları listeler (Admin yetkisi gerektirebilir).
   * @returns Kullanıcı listesini içeren UserResponse dizisini içeren Observable.
   */
  getAllUsers(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(`${this.apiUrl}/users`);
  }

  /**
   * Mevcut bir kullanıcının bilgilerini günceller.
   * @param id Güncellenecek kullanıcının ID'si.
   * @param userUpdateRequest Güncel bilgileri içeren UserUpdateRequest nesnesi.
   * @returns Güncellenen kullanıcı bilgilerini içeren UserResponse nesnesini içeren Observable.
   */
  updateUser(id: number, userUpdateRequest: UserUpdateRequest): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.apiUrl}/users/${id}`, userUpdateRequest);
  }

  /**
   * Belirli bir kullanıcının şifresini değiştirir.
   * @param id Şifresi değiştirilecek kullanıcının ID'si.
   * @param passwordChangeRequest Eski ve yeni şifre bilgilerini içeren PasswordChangeRequest nesnesi.
   * @returns İşlemin başarılı olup olmadığını belirten Observable<void>.
   */
  changePassword(id: number, passwordChangeRequest: PasswordChangeRequest): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/users/${id}/password`, passwordChangeRequest);
  }

  /**
   * Belirli bir ID'ye sahip kullanıcıyı siler (Admin yetkisi gerektirebilir).
   * @param id Silinecek kullanıcının ID'si.
   * @returns İşlemin başarılı olup olmadığını belirten Observable<void>.
   */
  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${id}`);
  }
}
