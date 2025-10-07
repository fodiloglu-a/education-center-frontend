import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';
import { HomeComponent } from "./features/home/components/home/home.component";
import { InstructorProfileComponent } from "./features/instructor/components/instructor-profile/instructor-profile.component";

// Error Pages
import { Error403Component } from "./features/pages/error-403/error-403.component";
import { Error401Component } from "./features/pages/error-401/error-401.component";
import { Error500Component } from "./features/pages/error-500/error-500.component";
import { Error404Component } from "./features/pages/error-404/error-404.component";

// Legal Pages
import { PrivacyPolicyComponent } from "./features/pages/privacy-policy/privacy-policy.component";
import { TermsOfServiceComponent } from "./features/pages/terms-of-service/terms-of-service.component";

export const routes: Routes = [
  // Ana sayfa
  {
    path: '',
    component: HomeComponent,
    title: 'Ana Sayfa'
  },
  {
    path: 'home',
    component: HomeComponent,
    title: 'Ana Sayfa'
  },

  // Auth modülü
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
    title: 'Giriş / Kayıt'
  },

  // User profile
  {
    path: 'profile',
    loadChildren: () => import('./features/user/user.routes').then(m => m.USER_ROUTES),
    canActivate: [AuthGuard],
    title: 'Profil'
  },

  // Kurslar
  {
    path: 'courses',
    loadChildren: () => import('./features/courses/courses.routes').then(m => m.COURSES_ROUTES),
    title: 'Kurslar'
  },

  // Ödeme sistemi - YENİ: Tüm payment route'ları burada
  {
    path: 'payment',
    loadChildren: () => import('./features/payment/payment.routes').then(m => m.PAYMENT_ROUTES),
    canActivate: [AuthGuard],
    title: 'Ödeme'
  },

  // Yorumlar
  {
    path: 'reviews',
    loadChildren: () => import('./features/reviews/reviews.routes').then(m => m.REVIEWS_ROUTES),
    title: 'Yorumlar'
  },

  // Sertifikalar
  {
    path: 'certificates',
    loadChildren: () => import('./features/certificates/certificates.routes').then(m => m.CERTIFICATES_ROUTES),
    canActivate: [AuthGuard],
    title: 'Sertifikalar'
  },

  // Eğitmen paneli
  {
    path: 'instructor',
    loadChildren: () => import('./features/instructor/instructor.routes').then(m => m.INSTRUCTOR_ROUTES),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ROLE_INSTRUCTOR', 'ROLE_ADMIN'] },
    title: 'Eğitmen Paneli'
  },

  // Eğitmen profili
  {
    path: 'instructor/:id',
    component: InstructorProfileComponent,
    title: 'Eğitmen Profili'
  },

  // Admin paneli
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ROLE_ADMIN'] },
    title: 'Yönetici Paneli'
  },

  // ========== YASAL SAYFALAR ==========
  {
    path: 'privacy-policy',
    component: PrivacyPolicyComponent,
    title: 'Gizlilik Sözleşmesi'
  },
  {
    path: 'terms-of-service',
    component: TermsOfServiceComponent,
    title: 'Kullanım Şartları'
  },
  // Alternatif route'lar (SEO için)
  {
    path: 'privacy',
    redirectTo: '/privacy-policy',
    pathMatch: 'full'
  },
  {
    path: 'terms',
    redirectTo: '/terms-of-service',
    pathMatch: 'full'
  },
  {
    path: 'legal/privacy',
    redirectTo: '/privacy-policy',
    pathMatch: 'full'
  },
  {
    path: 'legal/terms',
    redirectTo: '/terms-of-service',
    pathMatch: 'full'
  },

  // ========== HATA SAYFALARI ==========
  // ÖNEMLİ: Hata sayfaları wildcard'dan ÖNCE tanımlanmalı!
  {
    path: '403',
    component: Error403Component,
    title: 'Erişim Engellendi - 403'
  },
  {
    path: '401',
    component: Error401Component,
    title: 'Yetkisiz Erişim - 401'
  },
  {
    path: '500',
    component: Error500Component,
    title: 'Sunucu Hatası - 500'
  },
  {
    path: '404',
    component: Error404Component,
    title: 'Sayfa Bulunamadı - 404'
  },

  // ========== WILDCARD ROUTE ==========
  // ÖNEMLİ: Bu route EN SON olmalı!
  {
    path: '**',
    component: Error404Component,
    title: 'Sayfa Bulunamadı - 404'
  }
];

/*
 * YENİ ROUTE YAPISI:
 *
 * /email/verify-email?token=xxx           → Email doğrulama
 * /email/verification-sent?email=xxx      → Email gönderildi bilgilendirme
 *
 * KULLANIM:
 * - Register sonrası: /email/verification-sent?email=user@example.com
 * - Email'den tıklama: /email/verify-email?token=abc123
 */