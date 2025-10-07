// auth.routes.ts

import { Routes } from '@angular/router';

// Email verification component'lerini import et
import { VerifyEmailComponent } from '../email/componenet/verify-email/verify-email.component';
import { VerificationSentComponent } from '../email/componenet/verification-sent/verification-sent.component';
import {RegisterComponent} from "./components/register/register.component";
import {LoginComponent} from "./components/login/login.component";

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    title: 'Giriş - Acadenon'
  },
  {
    path: 'register',
    component: RegisterComponent,
    title: 'Kayıt - Acadenon'
  },
  // 🆕 Email Verification Routes
  {
    path: 'verify-email',
    component: VerifyEmailComponent,
    title: 'Email Doğrulama - Acadenon'
  },
  {
    path: 'verification-sent',
    component: VerificationSentComponent,
    title: 'Email Gönderildi - Acadenon'
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  }
];

/*
 * ROUTE YAPISI:
 *
 * /auth/login                      → Login sayfası
 * /auth/register                   → Register sayfası
 * /auth/verify-email?token=xxx     → Email doğrulama sayfası
 * /auth/verification-sent?email=xxx → Email gönderildi bilgilendirme
 */