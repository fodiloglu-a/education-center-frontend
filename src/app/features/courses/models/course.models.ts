// course.models.ts

import { ReviewResponse } from '../../reviews/models/review.models'; // ReviewResponse arayüzünü import ediyoruz

// Backend'deki CourseResponse DTO'suna karşılık gelen arayüz.
// Eğitimlerin genel bilgilerini (liste görünümü için) tanımlar.
export interface CourseResponse {
  id: number;                  // Eğitimin benzersiz ID'si
  title: string;               // Eğitimin başlığı
  description: string;         // Eğitimin kısa açıklaması
  imageUrl:string;
  instructorName: string;      // Eğitmenin adı ve soyadı
  instructorId: number;
  price: number;               // Eğitimin fiyatı
  published: boolean;          // Eğitimin yayınlanıp yayınlanmadığı
  createdAt: string;           // Eğitimin oluşturulma tarihi (ISO 8601 string formatında)
  // Yeni eklenen alanlar
  category: CourseCategory;    // Eğitimin kategorisi
  enrollmentCount: number;     // Toplam kayıt/satış sayısı
  averageRating: number;       // Ortalama puan (0-5 arası)
  totalReviews: number;        // Toplam yorum sayısı
  duration: number;            // Eğitimin toplam süresi (dakika cinsinden)
  level: CourseLevel;          // Eğitim seviyesi (Başlangıç, Orta, İleri)
  language: string;            // Eğitim dili (örn: "tr", "en")
  externalPurchaseUrl?: string;
  lessons: LessonDTO[]; // Harici satın alma linki (opsiyonel)
  requirements: string[];      // Ön gereksinimler listesi
  whatYouWillLearn: string[];  // Öğrenilecekler listesi
  targetAudience: string[];    // Hedef kitle
  certificateAvailable: boolean; // Sertifika verilip verilmediği
  reviews: ReviewResponse[];   // Eğitime yapılan yorumların listesi
  updatedAt: string | null;
}

// Backend'deki CourseDetailsResponse DTO'suna karşılık gelen arayüz.
// Bir eğitimin detaylı bilgilerini (detay sayfası için) tanımlar.
export interface CourseDetailsResponse {
  id: number;                  // Eğitimin benzersiz ID'si
  title: string;               // Eğitimin başlığı
  description: string;         // Eğitimin detaylı açıklaması
  imageUrl: string;            // Eğitimin kapak görselinin URL'si
  instructorName: string;      // Eğitmenin adı ve soyadı
  instructorId: number;
  price: number;               // Eğitimin fiyatı
  published: boolean;          // Eğitimin yayınlanıp yayınlanmadığı
  createdAt: string;           // Eğitimin oluşturulma tarihi (ISO 8601 string formatında)
  updatedAt: string | null;    // Eğitimin son güncelleme tarihi (ISO 8601 string formatında veya null)
  lessons: LessonDTO[];        // Eğitime ait derslerin listesi
  reviews: ReviewResponse[];   // Eğitime yapılan yorumların listesi

  // Yeni eklenen alanlar
  category: CourseCategory;    // Eğitimin kategorisi
  enrollmentCount: number;     // Toplam kayıt/satış sayısı
  averageRating: number;       // Ortalama puan (0-5 arası)
  totalReviews: number;        // Toplam yorum sayısı
  duration: number;            // Eğitimin toplam süresi (dakika cinsinden)
  level: CourseLevel;          // Eğitim seviyesi
  language: string;            // Eğitim dili
  externalPurchaseUrl?: string; // Harici satın alma linki (opsiyonel)
  requirements: string[];      // Ön gereksinimler listesi
  whatYouWillLearn: string[];  // Öğrenilecekler listesi
  targetAudience: string[];    // Hedef kitle
  certificateAvailable: boolean; // Sertifika verilip verilmediği
}

// Eğitim kategorileri için enum
export enum CourseCategory {
  PROGRAMMING = 'PROGRAMMING',
  WEB_DEVELOPMENT = 'WEB_DEVELOPMENT',
  MOBILE_DEVELOPMENT = 'MOBILE_DEVELOPMENT',
  DATA_SCIENCE = 'DATA_SCIENCE',
  MACHINE_LEARNING = 'MACHINE_LEARNING',
  CYBER_SECURITY = 'CYBER_SECURITY',
  CLOUD_COMPUTING = 'CLOUD_COMPUTING',
  DEVOPS = 'DEVOPS',
  DESIGN = 'DESIGN',
  BUSINESS = 'BUSINESS',
  MARKETING = 'MARKETING',
  PERSONAL_DEVELOPMENT = 'PERSONAL_DEVELOPMENT',
  LANGUAGE = 'LANGUAGE',
  OTHER = 'OTHER'
}

// Eğitim seviyeleri için enum
export enum CourseLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  ALL_LEVELS = 'ALL_LEVELS'
}

// Backend'deki LessonDTO'ya karşılık gelen arayüz.
// Bir eğitime ait dersin bilgilerini tanımlar.
export interface LessonDTO {
  id: number;            // Dersin benzersiz ID'si
  title: string;         // Dersin başlığı
  description: string;   // Dersin açıklaması
  videoUrl: string;      // Ders videosunun URL'si
  lessonOrder: number;   // Dersin eğitim içindeki sırası

  // Yeni eklenen alanlar
  duration: number;      // Dersin süresi (dakika cinsinden)
  preview: boolean;    // Ücretsiz önizleme olarak izlenebilir mi
  resources?: string[];  // Ders kaynakları/dökümanları (opsiyonel)
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

  // Yeni eklenen alanlar
  courseCategory: CourseCategory; // Kayıt olunan eğitimin kategorisi
  lastAccessDate?: string; // Son erişim tarihi (ISO 8601 string formatında)
  completionDate?: string; // Tamamlanma tarihi (ISO 8601 string formatında)
  certificateUrl?: string; // Sertifika URL'i (eğer tamamlandıysa)
}

// Backend'deki EnrollmentDTO içindeki ProgressInfo'ya karşılık gelen arayüz.
// Ders ilerleme bilgilerini tanımlar.
export interface ProgressInfo {
  lessonId: number;           // Dersin ID'si
  lessonTitle: string;        // Dersin başlığı
  completionPercentage: number; // Dersin tamamlanma yüzdesi (0.0'dan 100.0'a kadar)
  completed: boolean;         // Dersin tamamlanıp tamamlanmadığı

  // Yeni eklenen alanlar
  lastWatchedPosition?: number; // Son izlenen pozisyon (saniye cinsinden)
  completedAt?: string;       // Tamamlanma tarihi (ISO 8601 string formatında)
}

// En çok satan kurslar için özel response modeli
export interface TopSellingCoursesResponse {
  category?: CourseCategory;   // Hangi kategoriye göre filtrelendi (opsiyonel)
  isPersonalized: boolean;     // Kişiselleştirilmiş mi yoksa genel mi
  courses: CourseResponse[];   // Kurs listesi
  totalCount: number;          // Toplam kurs sayısı
}