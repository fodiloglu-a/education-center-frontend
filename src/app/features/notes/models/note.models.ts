// src/app/features/notes/models/note.models.ts

// Backend'deki NoteRequest DTO'suna karşılık gelen arayüz.
// Bir kullanıcının bir derse not eklerken/güncellerken göndereceği bilgileri tanımlar.
export interface NoteRequest {
    lessonId: number;   // Notun hangi derse ait olduğu
    content: string;    // Notun içeriği
}

// Backend'deki NoteResponse DTO'suna karşılık gelen arayüz.
// İstemciye döndürülecek not bilgilerini içerir.
export interface NoteResponse {
    id: number;           // Notun benzersiz ID'si
    userId: number;       // Notu alan kullanıcının ID'si
    userName: string;     // Notu alan kullanıcının adı ve soyadı
    lessonId: number;     // Notun ait olduğu dersin ID'si
    lessonTitle: string;  // Notun ait olduğu dersin başlığı
    content: string;      // Notun içeriği
    createdAt: string;    // Notun oluşturulduğu tarih ve saat (ISO 8601 string formatında)
    updatedAt?: string;   // Notun son güncellendiği tarih ve saat (ISO 8601 string formatında veya null)
}