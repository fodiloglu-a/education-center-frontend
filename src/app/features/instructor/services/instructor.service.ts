// instructor.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment'; // Ortam değişkenlerini import ediyoruz
import { InstructorDashboardStats, InstructorCourseResponse, InstructorReviewResponse } from '../models/instructor.models'; // Eğitmen modellerini import ediyoruz
import { CourseResponse } from '../../courses/models/course.models'; // CourseResponse import edildi
import { ReviewResponse } from '../../reviews/models/review.models'; // ReviewResponse import edildi

// InstructorService, eğitmen paneli ile ilgili backend API çağrılarını yönetir.
// Eğitmenlere özel istatistikleri, kendi kurs listelerini ve yorumlarını getirir.
@Injectable({
  providedIn: 'root' // Bu servisin uygulamanın kök seviyesinde (singleton) sağlanacağını belirtir.
})
export class InstructorService {
  private apiUrl = environment.apiUrl; // Backend API URL'sini ortam değişkenlerinden alıyoruz

  constructor(private http: HttpClient) { }

  /**
   * Belirli bir eğitmenin genel gösterge panosu istatistiklerini getirir.
   * @param instructorId Eğitmenin ID'si.
   * @returns Eğitmen istatistiklerini içeren Observable<InstructorDashboardStats>.
   */
  getInstructorDashboardStats(instructorId: number): Observable<InstructorDashboardStats> {
    // Backend'de bu endpoint henüz yok, ileride eklenecek. Şimdilik mock veri dönebiliriz veya hata yönetimi yaparız.
    // Backend'de /api/instructors/{instructorId}/dashboard-stats gibi bir endpoint olabilir.
    return this.http.get<InstructorDashboardStats>(`${this.apiUrl}/instructors/${instructorId}/dashboard-stats`);
  }

  /**
   * Belirli bir eğitmenin oluşturduğu tüm kursları getirir.
   * @param instructorId Eğitmenin ID'si.
   * @returns Eğitmenin kurs listesini içeren Observable<InstructorCourseResponse[]>.
   */
  getInstructorCourses(instructorId: number): Observable<InstructorCourseResponse[]> {
    // Backend'de bu endpoint henüz yok, CourseService'deki getCoursesByInstructorId kullanılabilir.
    // Ancak InstructorCourseResponse daha detaylı bilgi gerektiriyorsa backend'de ayrı bir DTO ve endpoint gerekebilir.
    // Şimdilik CourseService'den gelen CourseResponse'u InstructorCourseResponse'a dönüştüreceğiz.
    return this.http.get<InstructorCourseResponse[]>(`${this.apiUrl}/courses/instructor/${instructorId}`);
  }

  /**
   * Belirli bir eğitmenin kurslarına yapılan tüm yorumları getirir.
   * @param instructorId Eğitmenin ID'si.
   * @returns Eğitmenin kurslarına yapılan yorumların listesini içeren Observable<InstructorReviewResponse[]>.
   */
  getInstructorReviews(instructorId: number): Observable<InstructorReviewResponse[]> {
    // Backend'de bu endpoint henüz yok. ReviewService'deki getReviewsByUserId kullanılabilir
    // veya eğitmenin tüm kurslarının yorumlarını getiren özel bir endpoint gerekebilir.
    // Şimdilik ReviewService'den gelen ReviewResponse'u InstructorReviewResponse'a dönüştüreceğiz.
    return this.http.get<InstructorReviewResponse[]>(`${this.apiUrl}/reviews/user/${instructorId}`);
  }

  // Not: Kurs oluşturma, güncelleme ve silme işlemleri CourseService üzerinden yapılacaktır.
  // Eğitmen paneli bileşenleri, CourseService'i kullanarak bu işlemleri tetikleyecektir.
  canAddCourse(instructorId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/instructors/${instructorId}/can-add-course`);
  }
}
