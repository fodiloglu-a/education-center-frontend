// course.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CourseResponse,
  CourseDetailsResponse,
  LessonDTO,
  TopSellingCoursesResponse,
  CourseCategory,
  CourseLevel
} from '../models/course.models';
import { environment } from '../../../../environments/environment';

// CourseService, eğitimlerle ilgili backend API çağrılarını yönetir.
// Eğitim oluşturma, güncelleme, silme, listeleme ve ders yönetimi gibi işlemleri kapsar.
@Injectable({
  providedIn: 'root' // Bu servisin uygulamanın kök seviyesinde (singleton) sağlanacağını belirtir.
})
export class CourseService {
  private apiUrl = `${environment.apiUrl}/courses`; // Backend API URL'sini ortam değişkenlerinden alıyoruz

  constructor(private http: HttpClient) { }

  /**
   * Yeni bir eğitim oluşturur. (ADMIN veya INSTRUCTOR yetkisi gerektirir)
   * @param courseDetails Eğitim bilgilerini içeren CourseDetailsResponse nesnesi.
   * @returns Oluşturulan eğitimin CourseResponse nesnesini içeren Observable.
   */
  createCourse(courseDetails: CourseDetailsResponse): Observable<CourseResponse> {
    return this.http.post<CourseResponse>(this.apiUrl, courseDetails);
  }

  /**
   * Belirli bir ID'ye sahip eğitimi günceller. (Eğitimin sahibi veya ADMIN yetkisi gerektirir)
   * @param courseId Güncellenecek eğitimin ID'si.
   * @param courseDetails Yeni eğitim bilgilerini içeren CourseDetailsResponse nesnesi.
   * @returns Güncellenen eğitimin CourseResponse nesnesini içeren Observable.
   */
  updateCourse(courseId: number, courseDetails: CourseDetailsResponse): Observable<CourseResponse> {
    return this.http.put<CourseResponse>(`${this.apiUrl}/${courseId}`, courseDetails);
  }

  /**
   * Belirli bir ID'ye sahip eğitimi siler. (Eğitimin sahibi veya ADMIN yetkisi gerektirir)
   * @param courseId Silinecek eğitimin ID'si.
   * @returns İşlemin başarılı olup olmadığını belirten Observable<void>.
   */
  deleteCourse(courseId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${courseId}`);
  }

  /**
   * Belirli bir ID'ye sahip eğitimin detaylarını getirir. (Herkese açık)
   * @param courseId Eğitimin ID'si.
   * @returns Eğitimin detaylı bilgilerini içeren CourseDetailsResponse nesnesini içeren Observable.
   */
  getCourseDetailsById(courseId: number): Observable<CourseDetailsResponse> {
    return this.http.get<CourseDetailsResponse>(`${this.apiUrl}/${courseId}`);
  }

  /**
   * Tüm yayınlanmış eğitimleri listeler. (Herkese açık)
   * @returns Yayınlanmış eğitimlerin CourseResponse dizisini içeren Observable.
   */
  getAllPublishedCourses(): Observable<CourseResponse[]> {
    return this.http.get<CourseResponse[]>(`${this.apiUrl}/published`);
  }

  /**
   * Belirli bir eğitmenin tüm eğitimlerini listeler. (Herkese açık)
   * @param instructorId Eğitmenin ID'si.
   * @returns Eğitmene ait eğitimlerin CourseResponse dizisini içeren Observable.
   */
  getCoursesByInstructorId(instructorId: number): Observable<CourseResponse[]> {
    return this.http.get<CourseResponse[]>(`${this.apiUrl}/instructor/${instructorId}`);
  }

  /**
   * Bir eğitime yeni bir ders ekler. (Eğitimin sahibi veya ADMIN yetkisi gerektirir)
   * @param courseId Dersin ekleneceği eğitimin ID'si.
   * @param lesson Ders bilgilerini içeren LessonDTO nesnesi.
   * @returns Güncellenen eğitimin CourseDetailsResponse nesnesini içeren Observable.
   */
  addLessonToCourse(courseId: number, lesson: LessonDTO): Observable<CourseDetailsResponse> {
    return this.http.post<CourseDetailsResponse>(`${this.apiUrl}/${courseId}/lessons`, lesson);
  }

  /**
   * Bir eğitimdeki dersi günceller. (Eğitimin sahibi veya ADMIN yetkisi gerektirir)
   * @param courseId Dersin ait olduğu eğitimin ID'si.
   * @param lessonId Güncellenecek dersin ID'si.
   * @param lesson Yeni ders bilgilerini içeren LessonDTO nesnesi.
   * @returns Güncellenen eğitimin CourseDetailsResponse nesnesini içeren Observable.
   */
  updateLessonInCourse(courseId: number, lessonId: number, lesson: LessonDTO): Observable<CourseDetailsResponse> {
    return this.http.put<CourseDetailsResponse>(`${this.apiUrl}/${courseId}/lessons/${lessonId}`, lesson);
  }

  /**
   * Bir eğitimden dersi siler. (Eğitimin sahibi veya ADMIN yetkisi gerektirir)
   * @param courseId Dersin ait olduğu eğitimin ID'si.
   * @param lessonId Silinecek dersin ID'si.
   * @returns İşlemin başarılı olup olmadığını belirten Observable<void>.
   */
  deleteLessonFromCourse(courseId: number, lessonId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${courseId}/lessons/${lessonId}`);
  }

  /**
   * Bir eğitimi yayınlar veya yayından kaldırır. (Eğitimin sahibi veya ADMIN yetkisi gerektirir)
   * @param courseId Durumu değiştirilecek eğitimin ID'si.
   * @returns Güncellenen eğitimin CourseResponse nesnesini içeren Observable.
   */
  toggleCoursePublishedStatus(courseId: number): Observable<CourseResponse> {
    return this.http.patch<CourseResponse>(`${this.apiUrl}/${courseId}/toggle-publish`, {});
  }

  /**
   * Eğitimleri başlığa göre arar. (Herkese açık)
   * @param title Aranacak başlık metni.
   * @returns Başlıkta arama metnini içeren yayınlanmış eğitimlerin CourseResponse dizisini içeren Observable.
   */
  searchCoursesByTitle(title: string): Observable<CourseResponse[]> {
    const params = new HttpParams().set('title', title);
    return this.http.get<CourseResponse[]>(`${this.apiUrl}/search`, { params });
  }

  // ==================== YENİ EKLENEN METODLAR ====================

  /**
   * En çok satan kursları getirir. Kullanıcı giriş yapmışsa kişiselleştirilmiş sonuçlar döner.
   * @param limit Döndürülecek kurs sayısı (varsayılan: 5)
   * @param personalized Kişiselleştirilmiş sonuçlar istenip istenmediği
   * @param userId Kişiselleştirme için kullanıcı ID'si (opsiyonel)
   * @returns En çok satan kursların CourseResponse dizisini içeren Observable.
   */
  getTopSellingCourses(limit: number = 5, personalized: boolean = true, userId: number | null = null): Observable<CourseResponse[]> {
    let params = new HttpParams()
        .set('limit', limit.toString())
        .set('personalized', personalized.toString());
    // Backend'de userId parametresi @RequestParam olarak alınmıyorsa burada göndermeyin
    // Ancak CourseService'iniz bunu alıyorsa, burada eklemek doğru olur
    // if (userId !== null) {
    //   params = params.set('userId', userId.toString());
    // }
    return this.http.get<CourseResponse[]>(`${this.apiUrl}/top-selling`, { params });
  }

  /**
   * Belirli bir kategorideki en çok satan kursları getirir.
   * @param category Kurs kategorisi
   * @param limit Döndürülecek kurs sayısı (varsayılan: 5)
   * @returns Kategoriye göre en çok satan kursların CourseResponse dizisini içeren Observable.
   */
  getTopSellingCoursesByCategory(category: CourseCategory, limit: number = 5): Observable<CourseResponse[]> {
    const params = new HttpParams()
        .set('category', category)
        .set('limit', limit.toString());

    return this.http.get<CourseResponse[]>(`${this.apiUrl}/top-selling/category`, { params });
  }

  /**
   * Kursları çeşitli kriterlere göre filtreler.
   * @param filters Filtre kriterleri
   * @returns Filtrelenmiş kursların CourseResponse dizisini içeren Observable.
   */
  filterCourses(filters: {
    category?: CourseCategory;
    level?: CourseLevel;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    language?: string;
    searchTerm?: string;
  }): Observable<CourseResponse[]> {
    let params = new HttpParams();

    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof typeof filters];
      if (value !== undefined && value !== null) {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<CourseResponse[]>(`${this.apiUrl}/filter`, { params });
  }

  /**
   * Kullanıcının satın aldığı kurslara göre önerilen kursları getirir.
   * @param userId Kullanıcının ID'si
   * @param limit Döndürülecek kurs sayısı (varsayılan: 10)
   * @returns Önerilen kursların CourseResponse dizisini içeren Observable.
   */
  getRecommendedCourses(userId: number, limit: number = 10): Observable<CourseResponse[]> {
    const params = new HttpParams().set('limit', limit.toString());
    // Backend endpoint'inizde userId'yi path variable olarak mı yoksa request param olarak mı aldığınıza dikkat edin.
    // Şuan ki Controller'ınızda RequestParam olarak alıyor, ancak eğer satın alınan kursları fetch edip onlardan kategori alıyorsanız
    // o zaman bu endpoint'in userId'yi doğrudan path variable olarak alması daha mantıklı olabilir.
    // Örneğin: /api/courses/recommended/user/{userId}
    // Ancak şimdilik mevcut backend controller'ınızdaki /api/courses/recommended?limit={limit} yapısına göre ayarlıyorum.
    // Backend'de personalized logic userId'ye göre yapılıyor.
    return this.http.get<CourseResponse[]>(`${this.apiUrl}/recommended`, { params });
  }


  /**
   * Belirli bir kategorideki kursları getirir.
   * @param category Kurs kategorisi
   * @returns Kategorideki kursların CourseResponse dizisini içeren Observable.
   */
  getCoursesByCategory(category: CourseCategory): Observable<CourseResponse[]> {
    const params = new HttpParams().set('category', category);
    return this.http.get<CourseResponse[]>(`${this.apiUrl}/by-category`, { params });
  }

  /**
   * Popüler kategorileri ve her kategorideki kurs sayısını getirir.
   * @returns Kategori istatistiklerini içeren Observable.
   */
  getPopularCategories(): Observable<{ category: CourseCategory; count: number; }[]> {
    return this.http.get<{ category: CourseCategory; count: number; }[]>(`${this.apiUrl}/popular-categories`);
  }

  /**
   * Belirli bir kursa benzer kursları getirir.
   * @param courseId Referans kursun ID'si
   * @param limit Döndürülecek kurs sayısı (varsayılan: 5)
   * @returns Benzer kursların CourseResponse dizisini içeren Observable.
   */
  getSimilarCourses(courseId: number, limit: number = 5): Observable<CourseResponse[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<CourseResponse[]>(`${this.apiUrl}/${courseId}/similar`, { params });
  }

  /**
   * Yeni eklenen kursları getirir.
   * @param days Son kaç gün içinde eklenenler (varsayılan: 30)
   * @param limit Döndürülecek kurs sayısı (varsayılan: 10)
   * @returns Yeni kursların CourseResponse dizisini içeren Observable.
   */
  getNewCourses(days: number = 30, limit: number = 10): Observable<CourseResponse[]> {
    const params = new HttpParams()
        .set('days', days.toString())
        .set('limit', limit.toString());

    return this.http.get<CourseResponse[]>(`${this.apiUrl}/new`, { params });
  }

  /**
   * İndirimli kursları getirir.
   * @returns İndirimli kursların CourseResponse dizisini içeren Observable.
   */
  getDiscountedCourses(): Observable<CourseResponse[]> {
    return this.http.get<CourseResponse[]>(`${this.apiUrl}/discounted`);
  }

  /**
   * Kullanıcının satın aldığı tüm kursları getirir.
   * @param userId Kullanıcının ID'si.
   * @returns Satın alınan kursların CourseResponse dizisini içeren Observable.
   */
  getPurchasedCoursesByUserId(userId: number): Observable<CourseResponse[]> {
    // Backend Controller'ınızdaki ilgili endpoint: @GetMapping("/purchased/user/{userId}")
    return this.http.get<CourseResponse[]>(`${this.apiUrl}/purchased/user/${userId}`);
  }
}