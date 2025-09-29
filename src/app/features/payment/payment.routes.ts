// src/app/features/payment/payment.routes.ts

import { Routes } from '@angular/router';
import {AuthGuard} from "../../core/guards/auth.guard";


export const PAYMENT_ROUTES: Routes = [
    // Checkout sayfası - /payment/checkout/:courseId
    {
        path: 'checkout/:courseId',
        loadComponent: () =>
            import('./components/payment-checkout/payment-checkout.component')
                .then(c => c.PaymentCheckoutComponent),
        canActivate: [AuthGuard],
        title: 'Ödeme - Checkout'
    },

    // Payment callback - /payment/callback
    {
        path: 'callback',
        loadComponent: () =>
            import('./components/payment-callback/payment-callback.component')
                .then(c => c.PaymentCallbackComponent),
        title: 'Ödeme Sonucu'
    },

    // Payment status - /payment/status/:orderId
    {
        path: 'status/:orderId',
        loadComponent: () =>
            import('./components/payment-status/payment-status.component')
                .then(c => c.PaymentStatusComponent),
        canActivate: [AuthGuard],
        title: 'Ödeme Durumu'
    },

    // Payment success - /payment/success
    {
        path: 'success',
        loadComponent: () =>
            import('./components/payment-success/payment-success.component')
                .then(c => c.PaymentSuccessComponent),
        title: 'Ödeme Başarılı'
    },

    // Payment failure - /payment/failure
    {
        path: 'failure',
        loadComponent: () =>
            import('./components/payment-failure/payment-failure.component')
                .then(c => c.PaymentFailureComponent),
        title: 'Ödeme Başarısız'
    },

    // Payment history - /payment/history
    {
        path: 'history',
        loadComponent: () =>
            import('./components/payment-history/payment-history.component')
                .then(c => c.PaymentHistoryComponent),
        canActivate: [AuthGuard],
        title: 'Ödeme Geçmişi'
    },

    // Redirect for old checkout URLs - /checkout/:courseId → /payment/checkout/:courseId
    {
        path: 'redirect/checkout/:courseId',
        redirectTo: '/payment/checkout/:courseId',
        pathMatch: 'full'
    },

    // Default payment route redirect to history
    {
        path: '',
        redirectTo: 'history',
        pathMatch: 'full'
    }
];