// admin.routes.ts

import { Routes } from '@angular/router';
// Yönetici paneli bileşenlerini buraya import edeceğiz (ileride oluşturulacaklar)
// import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
// import { UserManagementComponent } from './components/user-management/user-management.component';
// import { CourseManagementComponent } from './components/course-management/course-management.component';

// Yönetici modülüne (admin) özel yönlendirme tanımları.
// Bu rotalar, '/admin' ana yolu altında çalışacaktır (app.routes.ts'deki tanıma göre).
// Bu rotalara erişim, AuthGuard ve RoleGuard tarafından 'ROLE_ADMIN' rolü ile korunacaktır.
export const ADMIN_ROUTES: Routes = [
  {
    path: '', // '/admin' yolu (ana yönetici paneli sayfası)
    // component: AdminDashboardComponent, // İleride oluşturulacak
    title: 'Yönetici Paneli' // Sayfa başlığı
  },
  {
    path: 'users', // '/admin/users' yolu (kullanıcı yönetimi)
    // component: UserManagementComponent, // İleride oluşturulacak
    title: 'Kullanıcı Yönetimi'
  },
  {
    path: 'courses', // '/admin/courses' yolu (eğitim yönetimi)
    // component: CourseManagementComponent, // İleride oluşturulacak
    title: 'Eğitim Yönetimi'
  },
  // İleride eklenebilecek diğer yönetici rotaları:
  // { path: 'settings', component: AdminSettingsComponent, title: 'Yönetici Ayarları' },
];
