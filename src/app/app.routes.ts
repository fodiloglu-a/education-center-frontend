// app.routes.ts

import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';

// Uygulamanın ana yönlendirme tanımları.
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'courses',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: 'profile',
    loadChildren: () => import('./features/user/user.routes').then(m => m.USER_ROUTES),
    canActivate: [AuthGuard]
  },
  {
    path: 'courses',
    loadChildren: () => import('./features/courses/courses.routes').then(m => m.COURSES_ROUTES)
  },
  {
    path: 'reviews',
    loadChildren: () => import('./features/reviews/reviews.routes').then(m => m.REVIEWS_ROUTES)
  },
  {
    path: 'certificates',
    loadChildren: () => import('./features/certificates/certificates.routes').then(m => m.CERTIFICATES_ROUTES),
    canActivate: [AuthGuard]
  },
  {
    path: 'instructor', // Yeni eğitmen rotası
    loadChildren: () => import('./features/instructor/instructor.routes').then(m => m.INSTRUCTOR_ROUTES),
    canActivate: [AuthGuard, RoleGuard], // Oturum açmış ve belirli bir role sahip kullanıcılar erişebilir
    data: { roles: ['ROLE_INSTRUCTOR', 'ROLE_ADMIN'] }, // Sadece eğitmenler veya adminler erişebilir
    title: 'Eğitmen Paneli'
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ROLE_ADMIN'] },
    title: 'Yönetici Paneli'
  },
  {
    path: '**',
    redirectTo: 'courses'
  }
];
