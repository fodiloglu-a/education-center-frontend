// reviews.routes.ts

import { Routes } from '@angular/router';
import { ReviewListComponent } from './components/review-list/review-list.component'; // Yorum listesi bileşeni
import { ReviewFormComponent } from './components/review-form/review-form.component'; // Yorum formu bileşeni
import { AuthGuard } from '../../core/guards/auth.guard'; // AuthGuard'ı import ediyoruz

// Yorumlar modülüne (reviews) özel yönlendirme tanımları.
// Bu rotalar, '/reviews' ana yolu altında çalışacaktır (app.routes.ts'deki tanıma göre).
export const REVIEWS_ROUTES: Routes = [
  {
    path: '', // '/reviews' yolu (tüm yorumların listesi veya genel yorum sayfası)
    component: ReviewListComponent, // ReviewListComponent'i yükler
    title: 'Yorumlar' // Sayfa başlığı
  },
  {
    path: 'course/:courseId', // '/reviews/course/:courseId' yolu (belirli bir eğitime ait yorumlar)
    component: ReviewListComponent, // Belirli bir eğitime ait yorumları göstermek için de kullanılabilir
    title: 'Eğitim Yorumları'
  },
  {
    path: 'new/:courseId', // '/reviews/new/:courseId' yolu (yeni yorum yapma)
    component: ReviewFormComponent, // ReviewFormComponent'i yükler
    canActivate: [AuthGuard], // Sadece oturum açmış kullanıcılar yorum yapabilir
    title: 'Yorum Yap'
  },
  {
    path: 'edit/:reviewId', // '/reviews/edit/:reviewId' yolu (yorum düzenleme)
    component: ReviewFormComponent, // ReviewFormComponent'i yükler
    canActivate: [AuthGuard], // Sadece oturum açmış kullanıcılar yorum düzenleyebilir
    title: 'Yorumu Düzenle'
  },
  {
    path: 'user/:userId', // '/reviews/user/:userId' yolu (belirli bir kullanıcıya ait yorumlar)
    component: ReviewListComponent, // Belirli bir kullanıcıya ait yorumları göstermek için de kullanılabilir
    canActivate: [AuthGuard], // Sadece oturum açmış kullanıcılar kendi yorumlarını veya ADMIN tüm yorumları görebilir
    title: 'Kullanıcı Yorumları'
  }
];
