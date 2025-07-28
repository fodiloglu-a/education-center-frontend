// auth.models.ts

// Backend'deki LoginRequest DTO'suna karşılık gelen arayüz.
// Kullanıcının giriş yaparken göndereceği e-posta ve şifre bilgilerini tanımlar.
export interface LoginRequest {
  email: string;
  password: string;
}

// Backend'deki JwtResponse DTO'suna karşılık gelen arayüz.
// Başarılı bir kimlik doğrulama sonrası backend'den dönen JWT ve kullanıcı bilgilerini tanımlar.
export interface JwtResponse {
  token: string;
  type: string;
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

// Backend'deki RegisterRequest DTO'suna karşılık gelen arayüz.
// Yeni bir kullanıcı kaydolurken göndereceği bilgileri tanımlar.
export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string; // Yeni eklenen alan: Kullanıcının seçtiği rol
}
