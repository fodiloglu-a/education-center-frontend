// src/app/features/payment/models/payment.models.ts
export interface PaymentResponse {
    data: string;
    signature: string;
}

export interface LiqPayCallbackData {
    status: string;
    order_id: string;
    amount: string;
    currency: string;
    description: string;
    custom_data: string;
    // Diğer olası alanlar...
}