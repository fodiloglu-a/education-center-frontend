// course.models.ts

import { ReviewResponse } from '../../reviews/models/review.models'; // ReviewResponse arayüzünü import ediyoruz

// Backend'deki CourseResponse DTO'suna karşılık gelen arayüz.
// Eğitimlerin genel bilgilerini (liste görünümü için) tanımlar.
export interface CourseResponse {
  id: number;            // Eğitimin benzersiz ID'si
  title: string;         // Eğitimin başlığı
  description: string;   // Eğitimin kısa açıklaması
  imageUrl: string;      // Eğitimin kapak görselinin URL'si
  instructorName: string; // Eğitmenin adı ve soyadı
  price: number;         // Eğitimin fiyatı
  published: boolean;    // Eğitimin yayınlanıp yayınlanmadığı
  createdAt: string;     // Eğitimin oluşturulma tarihi (ISO 8601 string formatında)
}

// Backend'deki CourseDetailsResponse DTO'suna karşılık gelen arayüz.
// Bir eğitimin detaylı bilgilerini (detay sayfası için) tanımlar.
export interface CourseDetailsResponse {
  id: number;            // Eğitimin benzersiz ID'si
  title: string;         // Eğitimin başlığı
  description: string;   // Eğitimin detaylı açıklaması
  imageUrl: string;      // Eğitimin kapak görselinin URL'si
  instructorName: string; // Eğitmenin adı ve soyadı
  price: number;         // Eğitimin fiyatı
  published: boolean;    // Eğitimin yayınlanıp yayınlanmadığı
  createdAt: string;     // Eğitimin oluşturulma tarihi (ISO 8601 string formatında)
  updatedAt: string | null; // Eğitimin son güncelleme tarihi (ISO 8601 string formatında veya null)
  lessons: LessonDTO[];  // Eğitime ait derslerin listesi
  reviews: ReviewResponse[]; // Eğitime yapılan yorumların listesi
}

// Backend'deki LessonDTO'ya karşılık gelen arayüz.
// Bir eğitime ait dersin bilgilerini tanımlar.
export interface LessonDTO {
  id: number;            // Dersin benzersiz ID'si
  title: string;         // Dersin başlığı
  description: string;   // Dersin açıklaması
  videoUrl: string;      // Ders videosunun URL'si
  lessonOrder: number;   // Dersin eğitim içindeki sırası
}

// Backend'deki EnrollmentDTO'ya karşılık gelen arayüz.
// Bir kullanıcının bir eğitime kaydını ve bu kayıta ait ilerleme bilgilerini tanımlar.
export interface EnrollmentDTO {
  id: number;            // Kayıt işleminin benzersiz ID'si
  userId: number;        // Kaydolan kullanıcının ID'si
  userName: string;      // Kaydolan kullanıcının adı ve soyadı
  courseId: number;      // Kayıt olunan eğitimin ID'si
  courseTitle: string;   // Kayıt olunan eğitimin başlığı
  enrollmentDate: string; // Kayıt tarihi (ISO 8601 string formatında)
  completed: boolean;    // Eğitimin tamamlanıp tamamlanmadığı
  progresses: ProgressInfo[]; // Bu kayıttaki ders ilerlemeleri
}

// Backend'deki EnrollmentDTO içindeki ProgressInfo'ya karşılık gelen arayüz.
// Ders ilerleme bilgilerini tanımlar.
export interface ProgressInfo {
  lessonId: number;           // Dersin ID'si
  lessonTitle: string;        // Dersin başlığı
  completionPercentage: number; // Dersin tamamlanma yüzdesi (0.0'dan 100.0'a kadar)
  completed: boolean;         // Dersin tamamlanıp tamamlanmadığı
}
