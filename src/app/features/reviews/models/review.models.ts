// review.models.ts

// Backend'deki ReviewRequest DTO'suna karşılık gelen arayüz.
// Bir kullanıcının bir eğitime yorum yaparken göndereceği bilgileri tanımlar.
export interface ReviewRequest {
  courseId: number; // Yorumun yapılacağı eğitimin ID'si
  rating: number;   // Eğitime verilen puan (örn. 1-5 arası)
  comment: string;  // Kullanıcının yazdığı yorum metni
}

// Backend'deki ReviewResponse DTO'suna karşılık gelen arayüz.
// İstemciye döndürülecek yorum bilgilerini içerir.
export interface ReviewResponse {
  id: number;           // Yorumun benzersiz ID'si
  userId: number;       // Yorumu yapan kullanıcının ID'si
  userName: string;     // Yorumu yapan kullanıcının adı ve soyadı
  courseId: number;     // Yorumun yapıldığı eğitimin ID'si
  courseTitle: string;  // Yorumun yapıldığı eğitimin başlığı
  rating: number;       // Eğitime verilen puan
  comment: string;      // Kullanıcının yazdığı yorum metni
  createdAt: string;    // Yorumun yapıldığı tarih ve saat (ISO 8601 string formatında)
}
