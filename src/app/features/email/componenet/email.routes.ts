// email.routes.ts

import { Routes } from '@angular/router';
import {VerificationSentComponent} from "./verification-sent/verification-sent.component";
import {VerifyEmailComponent} from "./verify-email/verify-email.component";


/**
 * Email Verification Routes
 * Email doğrulama ile ilgili tüm route'lar
 */
export const EMAIL_ROUTES: Routes = [
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
    // Email ana sayfası redirect (opsiyonel)
    {
        path: '',
        redirectTo: 'verification-sent',
        pathMatch: 'full'
    }
];

/*
 * ROUTE KULLANIMI:
 *
 * /email/verify-email?token=xxx           → Email doğrulama sayfası
 * /email/verification-sent?email=xxx      → Email gönderildi bilgilendirme
 */