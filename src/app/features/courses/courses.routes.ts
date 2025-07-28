import { Routes } from '@angular/router';
import { CourseListComponent } from './components/course-list/course-list.component';
import { CourseDetailComponent } from './components/course-detail/course-detail.component';
import { CourseFormComponent } from './components/course-form/course-form.component';
import { LessonFormComponent } from './components/lesson-form/lesson-form.component';
import { LessonPlayerComponent } from './components/lesson-player/lesson-player.component';
import { AuthGuard } from '../../core/guards/auth.guard';
import { RoleGuard } from '../../core/guards/role.guard';

export const COURSES_ROUTES: Routes = [

  // 🔹 Tüm kursları listeleme (ana sayfa gibi)
  {
    path: '',
    component: CourseListComponent,
    title: 'Tüm Eğitimler'
  },

  // 🔹 Arama sonuçları
  {
    path: 'search',
    component: CourseListComponent,
    title: 'Eğitim Ara'
  },

  // 🔹 Yeni kurs oluşturma
  {
    path: 'new',
    component: CourseFormComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ROLE_INSTRUCTOR', 'ROLE_ADMIN'] },
    title: 'Yeni Eğitim Oluştur'
  },

  // 🔹 Kurs düzenleme
  {
    path: ':courseId/edit',
    component: CourseFormComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ROLE_INSTRUCTOR', 'ROLE_ADMIN'] },
    title: 'Eğitimi Düzenle'
  },

  // 🔹 Yeni ders oluşturma
  {
    path: ':courseId/lessons/new',
    component: LessonFormComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ROLE_INSTRUCTOR', 'ROLE_ADMIN'] },
    title: 'Yeni Ders Ekle'
  },

  // 🔹 Mevcut dersi düzenleme
  {
    path: ':courseId/lessons/:lessonId/edit',
    component: LessonFormComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ROLE_INSTRUCTOR', 'ROLE_ADMIN'] },
    title: 'Dersi Düzenle'
  },

  // 🔹 Belirli dersi izleme (video oynatma)
  {
    path: ':courseId/lessons/:lessonId',
    component: LessonPlayerComponent,
    canActivate: [AuthGuard],
    title: 'Ders İzle'
  },

  // 🔹 Kurs detay sayfası
  {
    path: ':courseId',
    component: CourseDetailComponent,
    title: 'Eğitim Detayı'
  }

];
