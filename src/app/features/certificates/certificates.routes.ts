// certificates.routes.ts

import { Routes } from '@angular/router';
import { CertificateListComponent } from './components/certificate-list/certificate-list.component';     // Sertifika listesi bileşeni
import { CertificateDetailComponent } from './components/certificate-detail/certificate-detail.component'; // Sertifika detay bileşeni
import { CertificateVerifyComponent } from './components/certificate-verify/certificate-verify.component'; // Sertifika doğrulama bileşeni
import { AuthGuard } from '../../core/guards/auth.guard'; // AuthGuard'ı import ediyoruz
import { RoleGuard } from '../../core/guards/role.guard'; // RoleGuard'ı import ediyoruz

// Sertifikalar modülüne (certificates) özel yönlendirme tanımları.
// Bu rotalar, '/certificates' ana yolu altında çalışacaktır (app.routes.ts'deki tanıma göre).
export const CERTIFICATES_ROUTES: Routes = [
  {
    path: '', // '/certificates' yolu (kullanıcının kendi sertifikaları listesi)
    component: CertificateListComponent, // CertificateListComponent'i yükler
    canActivate: [AuthGuard], // Sadece oturum açmış kullanıcılar kendi sertifikalarını görebilir
    title: 'Sertifikalarım' // Sayfa başlığı
  },
  {
    path: ':certificateId', // '/certificates/:certificateId' yolu (belirli bir sertifika detayı)
    component: CertificateDetailComponent, // CertificateDetailComponent'i yükler
    canActivate: [AuthGuard], // Sadece oturum açmış kullanıcılar erişebilir
    title: 'Sertifika Detayı'
  },
  {
    path: 'verify/:uniqueCode', // '/certificates/verify/:uniqueCode' yolu (sertifika doğrulama)
    component: CertificateVerifyComponent, // CertificateVerifyComponent'i yükler
    title: 'Sertifika Doğrula'
  },
  {
    path: 'generate/:userId/:courseId', // '/certificates/generate/:userId/:courseId' yolu (sertifika oluşturma - ADMIN/INSTRUCTOR için)
    component: CertificateDetailComponent, // Oluşturulduktan sonra detayını gösterebiliriz
    canActivate: [AuthGuard, RoleGuard], // Oturum açmış ve belirli bir role sahip kullanıcılar erişebilir
    data: { roles: ['ROLE_ADMIN', 'INSTRUCTOR'] }, // Sadece ADMIN veya INSTRUCTOR oluşturabilir
    title: 'Sertifika Oluştur'
  }
];
