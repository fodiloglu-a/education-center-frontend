// user.routes.ts

import { Routes } from '@angular/router';
import { ProfileComponent } from './components/profile/profile.component';             // Profil bileşenini import ediyoruz
import { ProfileEditComponent } from './components/profile-edit/profile-edit.component'; // Profil düzenleme bileşenini import ediyoruz
import { PasswordChangeComponent } from './components/password-change/password-change.component'; // Şifre değiştirme bileşenini import ediyoruz

// Kullanıcı modülüne (user) özel yönlendirme tanımları.
// Bu rotalar, '/profile' ana yolu altında çalışacaktır (app.routes.ts'deki tanıma göre).
export const USER_ROUTES: Routes = [
  {
    path: '', // '/profile' yolu (ana profil sayfası)
    component: ProfileComponent, // Profile bileşenini yükler
    title: 'Profilim' // Sayfa başlığı
  },
  {
    path: 'edit', // '/profile/edit' yolu
    component: ProfileEditComponent, // ProfileEdit bileşenini yükler
    title: 'Profili Düzenle' // Sayfa başlığı
  },
  {
    path: 'change-password', // '/profile/change-password' yolu
    component: PasswordChangeComponent, // PasswordChange bileşenini yükler
    title: 'Şifre Değiştir' // Sayfa başlığı
  }
];
