// course.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CourseResponse, CourseDetailsResponse, LessonDTO } from '../models/course.models'; // Eğitim modellerini import ediyoruz
import { environment } from '../../../../environments/environment'; // Ortam değişkenlerini import ediyoruz

// CourseService, eğitimlerle ilgili backend API çağrılarını yönetir.
// Eğitim oluşturma, güncelleme, silme, listeleme ve ders yönetimi gibi işlemleri kapsar.
@Injectable({
  providedIn: 'root' // Bu servisin uygulamanın kök seviyesinde (singleton) sağlanacağını belirtir.
})
export class CourseService {
  private apiUrl = environment.apiUrl; // Backend API URL'sini ortam değişkenlerinden alıyoruz

  constructor(private http: HttpClient) { }

  /**
   * Yeni bir eğitim oluşturur. (ADMIN veya INSTRUCTOR yetkisi gerektirir)
   * @param courseDetails Eğitim bilgilerini içeren CourseDetailsResponse nesnesi.
   * @returns Oluşturulan eğitimin CourseResponse nesnesini içeren Observable.
   */
  createCourse(courseDetails: CourseDetailsResponse): Observable<CourseResponse> {
    return this.http.post<CourseResponse>(`${this.apiUrl}/courses`, courseDetails);
  }

  /**
   * Belirli bir ID'ye sahip eğitimi günceller. (Eğitimin sahibi veya ADMIN yetkisi gerektirir)
   * @param courseId Güncellenecek eğitimin ID'si.
   * @param courseDetails Yeni eğitim bilgilerini içeren CourseDetailsResponse nesnesi.
   * @returns Güncellenen eğitimin CourseResponse nesnesini içeren Observable.
   */
  updateCourse(courseId: number, courseDetails: CourseDetailsResponse): Observable<CourseResponse> {
    return this.http.put<CourseResponse>(`${this.apiUrl}/courses/${courseId}`, courseDetails);
  }

  /**
   * Belirli bir ID'ye sahip eğitimi siler. (Eğitimin sahibi veya ADMIN yetkisi gerektirir)
   * @param courseId Silinecek eğitimin ID'si.
   * @returns İşlemin başarılı olup olmadığını belirten Observable<void>.
   */
  deleteCourse(courseId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/courses/${courseId}`);
  }

  /**
   * Belirli bir ID'ye sahip eğitimin detaylarını getirir. (Herkese açık)
   * @param courseId Eğitimin ID'si.
   * @returns Eğitimin detaylı bilgilerini içeren CourseDetailsResponse nesnesini içeren Observable.
   */
  getCourseDetailsById(courseId: number): Observable<CourseDetailsResponse> {
    return this.http.get<CourseDetailsResponse>(`${this.apiUrl}/courses/${courseId}`);
  }

  /**
   * Tüm yayınlanmış eğitimleri listeler. (Herkese açık)
   * @returns Yayınlanmış eğitimlerin CourseResponse dizisini içeren Observable.
   */
  getAllPublishedCourses(): Observable<CourseResponse[]> {
    return this.http.get<CourseResponse[]>(`${this.apiUrl}/courses/published`);
  }

  /**
   * Belirli bir eğitmenin tüm eğitimlerini listeler. (Herkese açık)
   * @param instructorId Eğitmenin ID'si.
   * @returns Eğitmene ait eğitimlerin CourseResponse dizisini içeren Observable.
   */
  getCoursesByInstructorId(instructorId: number): Observable<CourseResponse[]> {
    return this.http.get<CourseResponse[]>(`${this.apiUrl}/courses/instructor/${instructorId}`);
  }

  /**
   * Bir eğitime yeni bir ders ekler. (Eğitimin sahibi veya ADMIN yetkisi gerektirir)
   * @param courseId Dersin ekleneceği eğitimin ID'si.
   * @param lesson Ders bilgilerini içeren LessonDTO nesnesi.
   * @returns Güncellenen eğitimin CourseDetailsResponse nesnesini içeren Observable.
   */
  addLessonToCourse(courseId: number, lesson: LessonDTO): Observable<CourseDetailsResponse> {
    return this.http.post<CourseDetailsResponse>(`${this.apiUrl}/courses/${courseId}/lessons`, lesson);
  }

  /**
   * Bir eğitimdeki dersi günceller. (Eğitimin sahibi veya ADMIN yetkisi gerektirir)
   * @param courseId Dersin ait olduğu eğitimin ID'si.
   * @param lessonId Güncellenecek dersin ID'si.
   * @param lesson Yeni ders bilgilerini içeren LessonDTO nesnesi.
   * @returns Güncellenen eğitimin CourseDetailsResponse nesnesini içeren Observable.
   */
  updateLessonInCourse(courseId: number, lessonId: number, lesson: LessonDTO): Observable<CourseDetailsResponse> {
    return this.http.put<CourseDetailsResponse>(`${this.apiUrl}/courses/${courseId}/lessons/${lessonId}`, lesson);
  }

  /**
   * Bir eğitimden dersi siler. (Eğitimin sahibi veya ADMIN yetkisi gerektirir)
   * @param courseId Dersin ait olduğu eğitimin ID'si.
   * @param lessonId Silinecek dersin ID'si.
   * @returns İşlemin başarılı olup olmadığını belirten Observable<void>.
   */
  deleteLessonFromCourse(courseId: number, lessonId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/courses/${courseId}/lessons/${lessonId}`);
  }

  /**
   * Bir eğitimi yayınlar veya yayından kaldırır. (Eğitimin sahibi veya ADMIN yetkisi gerektirir)
   * @param courseId Durumu değiştirilecek eğitimin ID'si.
   * @returns Güncellenen eğitimin CourseResponse nesnesini içeren Observable.
   */
  toggleCoursePublishedStatus(courseId: number): Observable<CourseResponse> {
    return this.http.patch<CourseResponse>(`${this.apiUrl}/courses/${courseId}/toggle-publish`, {}); // PATCH isteği, boş body ile
  }

  /**
   * Eğitimleri başlığa göre arar. (Herkese açık)
   * @param title Aranacak başlık metni.
   * @returns Başlıkta arama metnini içeren yayınlanmış eğitimlerin CourseResponse dizisini içeren Observable.
   */
  searchCoursesByTitle(title: string): Observable<CourseResponse[]> {
    return this.http.get<CourseResponse[]>(`${this.apiUrl}/courses/search?title=${title}`);
  }
}
