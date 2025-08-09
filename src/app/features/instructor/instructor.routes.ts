// instructor.routes.ts

import { Routes } from '@angular/router';
import { InstructorDashboardComponent } from './components/instructor-dashboard/instructor-dashboard.component';
import { InstructorCourseListComponent } from './components/instructor-course-list/instructor-course-list.component';
import { InstructorReviewListComponent } from './components/instructor-review-list/instructor-review-list.component';
import { AddMaterialComponent } from "./components/add-material/add-material.component";
import { CouponCreateComponent } from './components/coupon-create/coupon-create.component';

// Eğitmen modülüne (instructor) özel yönlendirme tanımları.
// Bu rotalar, '/instructor' ana yolu altında çalışacaktır (app.routes.ts'deki tanıma göre).
export const INSTRUCTOR_ROUTES: Routes = [
  {
    path: '', // '/instructor' yolu (eğitmen ana paneli)
    component: InstructorDashboardComponent,
    title: 'Eğitmen Paneli' // Sayfa başlığı
  },
  {
    path: 'add-material', //
    component: AddMaterialComponent,
    title: 'Eğitmen Kurslarım'
  },
  {
    path: 'courses', // '/instructor/courses' yolu (eğitmen kurs listesi)
    component: InstructorCourseListComponent,
    title: 'Eğitmen Kurslarım'
  },
  {
    path: 'reviews', // '/instructor/reviews' yolu (eğitmen kurs yorumları)
    component: InstructorReviewListComponent,
    title: 'Kurs Yorumlarım'
  },
  {
    path: 'coupons/new', // '/instructor/coupons/new' yolu (yeni kupon oluşturma)
    component: CouponCreateComponent,
    title: 'Kupon Oluştur'
  },
  // İleride eklenebilecek diğer eğitmen rotaları (örn. kazançlar, öğrenci istatistikleri)
];