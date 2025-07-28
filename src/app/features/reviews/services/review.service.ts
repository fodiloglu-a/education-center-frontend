// review.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ReviewRequest, ReviewResponse } from '../models/review.models'; // Yorum modellerini import ediyoruz
import { environment } from '../../../../environments/environment'; // Ortam değişkenlerini import ediyoruz

// ReviewService, yorumlarla ilgili backend API çağrılarını yönetir.
// Yorum ekleme, güncelleme, silme, listeleme ve ortalama puan hesaplama gibi işlemleri kapsar.
@Injectable({
  providedIn: 'root' // Bu servisin uygulamanın kök seviyesinde (singleton) sağlanacağını belirtir.
})
export class ReviewService {
  private apiUrl = environment.apiUrl; // Backend API URL'sini ortam değişkenlerinden alıyoruz

  constructor(private http: HttpClient) { }

  /**
   * Yeni bir yorum ekler. (USER yetkisi gerektirir)
   * @param reviewRequest Yorum bilgilerini içeren ReviewRequest nesnesi.
   * @returns Eklenen yorumun ReviewResponse nesnesini içeren Observable.
   */
  addReview(reviewRequest: ReviewRequest): Observable<ReviewResponse> {
    return this.http.post<ReviewResponse>(`${this.apiUrl}/reviews`, reviewRequest);
  }

  /**
   * Belirli bir ID'ye sahip yorumu günceller. (Yorumun sahibi veya ADMIN yetkisi gerektirir)
   * @param reviewId Güncellenecek yorumun ID'si.
   * @param reviewRequest Yeni yorum bilgilerini içeren ReviewRequest nesnesi.
   * @returns Güncellenen yorumun ReviewResponse nesnesini içeren Observable.
   */
  updateReview(reviewId: number, reviewRequest: ReviewRequest): Observable<ReviewResponse> {
    return this.http.put<ReviewResponse>(`${this.apiUrl}/reviews/${reviewId}`, reviewRequest);
  }

  /**
   * Belirli bir ID'ye sahip yorumu siler. (Yorumun sahibi veya ADMIN yetkisi gerektirir)
   * @param reviewId Silinecek yorumun ID'si.
   * @returns İşlemin başarılı olup olmadığını belirten Observable<void>.
   */
  deleteReview(reviewId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/reviews/${reviewId}`);
  }

  /**
   * Belirli bir ID'ye sahip yorumu getirir. (Herkese açık)
   * @param reviewId Yorumun ID'si.
   * @returns Yorum bilgilerini içeren ReviewResponse nesnesini içeren Observable.
   */
  getReviewById(reviewId: number): Observable<ReviewResponse> {
    return this.http.get<ReviewResponse>(`${this.apiUrl}/reviews/${reviewId}`);
  }

  /**
   * Belirli bir eğitime ait tüm yorumları getirir. (Herkese açık)
   * @param courseId Eğitimin ID'si.
   * @returns Eğitime ait yorumların ReviewResponse dizisini içeren Observable.
   */
  getReviewsByCourseId(courseId: number): Observable<ReviewResponse[]> {
    return this.http.get<ReviewResponse[]>(`${this.apiUrl}/reviews/course/${courseId}`);
  }

  /**
   * Belirli bir kullanıcıya ait tüm yorumları getirir. (USER veya ADMIN yetkisi gerektirir)
   * @param userId Kullanıcının ID'si.
   * @returns Kullanıcıya ait yorumların ReviewResponse dizisini içeren Observable.
   */
  getReviewsByUserId(userId: number): Observable<ReviewResponse[]> {
    return this.http.get<ReviewResponse[]>(`${this.apiUrl}/reviews/user/${userId}`);
  }

  /**
   * Belirli bir eğitime ait ortalama puanı getirir. (Herkese açık)
   * @param courseId Eğitimin ID'si.
   * @returns Ortalama puanı içeren Observable<number>.
   */
  getAverageRatingForCourse(courseId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/reviews/course/${courseId}/average-rating`);
  }
}
