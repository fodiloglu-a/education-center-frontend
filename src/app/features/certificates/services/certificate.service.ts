// certificate.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CertificateResponse } from '../models/certificate.models'; // Sertifika modellerini import ediyoruz
import { environment } from '../../../../environments/environment'; // Ortam değişkenlerini import ediyoruz

// CertificateService, sertifikalarla ilgili backend API çağrılarını yönetir.
// Sertifika oluşturma, listeleme, detaylarını getirme ve silme gibi işlemleri kapsar.
@Injectable({
  providedIn: 'root' // Bu servisin uygulamanın kök seviyesinde (singleton) sağlanacağını belirtir.
})
export class CertificateService {
  private apiUrl = environment.apiUrl; // Backend API URL'sini ortam değişkenlerinden alıyoruz

  constructor(private http: HttpClient) { }

  /**
   * Bir kullanıcı için eğitim tamamlandığında sertifika oluşturur. (ADMIN veya INSTRUCTOR yetkisi gerektirir)
   * @param userId Sertifika oluşturulacak kullanıcının ID'si.
   * @param courseId Sertifikanın ait olacağı eğitimin ID'si.
   * @returns Oluşturulan sertifikanın CertificateResponse nesnesini içeren Observable.
   */
  generateCertificate(userId: number, courseId: number): Observable<CertificateResponse> {
    return this.http.post<CertificateResponse>(`${this.apiUrl}/certificates/generate?userId=${userId}&courseId=${courseId}`, {});
  }

  /**
   * Belirli bir ID'ye sahip sertifikayı getirir. (Herkese açık)
   * @param certificateId Sertifikanın ID'si.
   * @returns Sertifika bilgilerini içeren CertificateResponse nesnesini içeren Observable.
   */
  getCertificateById(certificateId: number): Observable<CertificateResponse> {
    return this.http.get<CertificateResponse>(`${this.apiUrl}/certificates/${certificateId}`);
  }

  /**
   * Belirli bir kullanıcıya ait tüm sertifikaları getirir. (Sertifika sahibi veya ADMIN yetkisi gerektirir)
   * @param userId Kullanıcının ID'si.
   * @returns Kullanıcıya ait sertifikaların CertificateResponse dizisini içeren Observable.
   */
  getCertificatesByUserId(userId: number): Observable<CertificateResponse[]> {
    return this.http.get<CertificateResponse[]>(`${this.apiUrl}/certificates/user/${userId}`);
  }

  /**
   * Belirli bir benzersiz koda sahip sertifikayı getirir (doğrulama için). (Herkese açık)
   * @param uniqueCode Sertifikanın benzersiz kodu.
   * @returns Sertifika bilgilerini içeren CertificateResponse nesnesini içeren Observable.
   */
  getCertificateByUniqueCode(uniqueCode: string): Observable<CertificateResponse> {
    return this.http.get<CertificateResponse>(`${this.apiUrl}/certificates/verify/${uniqueCode}`);
  }

  /**
   * Belirli bir ID'ye sahip sertifikayı siler. (Sertifika sahibi veya ADMIN yetkisi gerektirir)
   * @param certificateId Silinecek sertifikanın ID'si.
   * @returns İşlemin başarılı olup olmadığını belirten Observable<void>.
   */
  deleteCertificate(certificateId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/certificates/${certificateId}`);
  }
}
