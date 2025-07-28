// instructor.models.ts

import { CourseResponse } from '../../courses/models/course.models'; // CourseResponse modelini import ediyoruz
import { ReviewResponse } from '../../reviews/models/review.models'; // ReviewResponse modelini import ediyoruz

// Eğitmen paneli için genel istatistikleri içeren arayüz.
// Bu, eğitmen gösterge panosunda özet bilgiler göstermek için kullanılabilir.
export interface InstructorDashboardStats {
  totalCourses: number;         // Eğitmenin toplam kurs sayısı
  totalStudents: number;        // Eğitmenin kurslarına kayıtlı toplam öğrenci sayısı
  averageRating: number;        // Eğitmenin kurslarının ortalama puanı
  totalReviews: number;         // Eğitmenin kurslarına yapılan toplam yorum sayısı
  // İleride eklenebilecek diğer istatistikler (örn. toplam kazanç, tamamlanma oranları)
}

// Eğitmenin kendi kurslarını yönetirken kullanacağı detaylı kurs bilgileri arayüzü.
// CourseResponse'a ek olarak, eğitmene özel ek bilgiler içerebilir.
export interface InstructorCourseResponse extends CourseResponse {
  totalLessons: number;         // Kurstaki toplam ders sayısı
  totalEnrollments: number;     // Kursa kayıtlı öğrenci sayısı
  courseAverageRating: number;  // Kursun ortalama puanı
  // İleride eklenebilecek diğer kursa özel istatistikler
}

// Eğitmenin kendi kurslarına yapılan yorumları görüntülerken kullanacağı arayüz.
// ReviewResponse'a ek olarak, yoruma ait kurs bilgisi gibi ek bilgiler içerebilir.
export interface InstructorReviewResponse extends ReviewResponse {
  // ReviewResponse zaten courseId ve courseTitle içeriyor, bu yeterli olabilir.
  // Eğer yoruma özel ek eğitmen bilgisi gerekiyorsa buraya eklenebilir.
}
