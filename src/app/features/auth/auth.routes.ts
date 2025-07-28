// auth.routes.ts

import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';     // Login bileşenini import ediyoruz
import { RegisterComponent } from './components/register/register.component'; // Register bileşenini import ediyoruz

// Kimlik doğrulama modülüne (auth) özel yönlendirme tanımları.
// Bu rotalar, '/auth' ana yolu altında çalışacaktır.
export const AUTH_ROUTES: Routes = [
  {
    path: 'login',    // '/auth/login' yolu
    component: LoginComponent, // Login bileşenini yükler
    title: 'Giriş Yap' // Sayfa başlığı
  },
  {
    path: 'register', // '/auth/register' yolu
    component: RegisterComponent, // Register bileşenini yükler
    title: 'Kayıt Ol' // Sayfa başlığı
  },
  {
    path: '', // '/auth' ana yolu (eğer alt yol belirtilmezse)
    redirectTo: 'login', // Varsayılan olarak 'login' sayfasına yönlendir
    pathMatch: 'full' // Yolun tam eşleşmesi gerektiğini belirtir
  }
];
