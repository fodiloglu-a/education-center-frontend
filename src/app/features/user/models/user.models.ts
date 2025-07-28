// user.models.ts

// Backend'deki UserResponse DTO'suna karşılık gelen arayüz.
// Kullanıcının profil bilgilerini frontend'e güvenli bir şekilde göndermek için kullanılır.
// Hassas bilgiler (örn. şifre) içermez.
export interface UserResponse {
  id: number;          // Kullanıcı ID'si
  email: string;     // Kullanıcı e-posta adresi
  firstName: string; // Kullanıcının adı
  lastName: string;  // Kullanıcının soyadı
  role: string;      // Kullanıcının rolü
  enabled: boolean;  // Kullanıcı hesabının etkin olup olmadığı
  createdAt: string; // Kayıt tarihi (ISO 8601 string formatında)
  updatedAt: string | null; // Son güncelleme tarihi (ISO 8601 string formatında veya null)
}

// Backend'deki UserUpdateRequest DTO'suna karşılık gelen arayüz.
// Bir kullanıcının profil bilgilerini güncellemek için frontend'den gönderilen verileri tanımlar.
export interface UserUpdateRequest {
  firstName: string; // Güncellenecek kullanıcının adı
  lastName: string;  // Güncellenecek kullanıcının soyadı
  email: string;     // Güncellenecek kullanıcının e-posta adresi
}

// Backend'deki PasswordChangeRequest DTO'suna karşılık gelen arayüz.
// Kullanıcının şifresini değiştirmek için eski ve yeni şifre bilgilerini tanımlar.
export interface PasswordChangeRequest {
  oldPassword: string; // Kullanıcının mevcut şifresi
  newPassword: string; // Kullanıcının belirleyeceği yeni şifre
}
