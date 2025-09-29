import { Routes } from '@angular/router';

import { PaymentCheckoutComponent } from './components/payment-checkout/payment-checkout.component';

/**
 * Payment feature routes.
 * These routes are mounted under the `/checkout` path via lazy loading.
 */
export const PAYMENT_ROUTES: Routes = [
  {
    path: ':courseId',
    component: PaymentCheckoutComponent,
    title: 'Ödeme'
  }
];
