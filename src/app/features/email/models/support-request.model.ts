/**
 * Support Request Model
 * Backend SupportRequest DTO ile eşleşir
 */
export interface SupportRequest {
    fullName: string;
    email: string;
    phoneNumber: string;
    subject: string;
    message: string;
}

/**
 * Support Response Model
 */
export interface SupportResponse {
    success: boolean;
    message: string;
    email: string;
}