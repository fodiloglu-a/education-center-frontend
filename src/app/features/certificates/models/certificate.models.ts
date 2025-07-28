// certificate.models.ts

// Backend'deki CertificateResponse DTO'suna karşılık gelen arayüz.
// İstemciye döndürülecek sertifika bilgilerini içerir.
export interface CertificateResponse {
  id: number;           // Sertifikanın benzersiz ID'si
  userId: number;       // Sertifika sahibi kullanıcının ID'si
  userName: string;     // Sertifika sahibi kullanıcının adı ve soyadı
  courseId: number;     // Sertifikanın ait olduğu eğitimin ID'si
  courseTitle: string;  // Sertifikanın ait olduğu eğitimin başlığı
  issueDate: string;    // Sertifikanın verildiği tarih (ISO 8601 string formatında)
  uniqueCode: string;   // Sertifikanın benzersiz doğrulama kodu
  certificateUrl: string | null; // Sertifikanın PDF veya görsel olarak erişilebileceği URL (null olabilir)
}
