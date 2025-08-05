// src/app/features/payment/models/payment.models.ts
export interface PaymentResponse {
    data: string;
    signature: string;
    success?: boolean;
    message?: string;
}

export interface LiqPayCallbackData {
    status: string;
    order_id: string;
    amount: string;
    currency: string;
    description: string;
    custom_data?: string;
    transaction_id?: string;
    payment_id?: string;
    err_code?: string;
    err_description?: string;
}

export interface PaymentRequest {
    courseId: number;
    amount?: number;
    currency?: string;
    description?: string;
}

export interface PaymentError {
    code: string;
    message: string;
    details?: any;
}

// LiqPay status constants
export enum LiqPayStatus {
    SUCCESS = 'success',
    FAILURE = 'failure',
    ERROR = 'error',
    PROCESSING = 'processing',
    WAIT_SECURE = 'wait_secure',
    SANDBOX = 'sandbox'
}

// Payment validation helper
export function isValidPaymentResponse(response: any): response is PaymentResponse {
    return response &&
        typeof response.data === 'string' &&
        typeof response.signature === 'string' &&
        response.data.length > 0 &&
        response.signature.length > 0;
}