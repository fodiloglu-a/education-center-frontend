// src/app/features/payment/models/coupon.model.ts

export interface Coupon {
    id: number;
    code: string;
    instructor: {
        id: number;
        firstName: string;
        lastName: string;
        email: string;
    };
    discountType: DiscountType;
    discountValue: number;
    minimumAmount?: number;
    maximumDiscount?: number;
    validFrom: string;
    validUntil: string;
    usageLimit?: number;
    usedCount: number;
    isActive: boolean;
    applicableCourses?: Course[];
    applicableCategories?: CourseCategory[];
    description?: string;
    createdAt: string;
    updatedAt: string;
}

export enum DiscountType {
    PERCENTAGE = 'PERCENTAGE',
    FIXED_AMOUNT = 'FIXED_AMOUNT'
}

export enum CourseCategory {
    PROGRAMMING = 'PROGRAMMING',
    DESIGN = 'DESIGN',
    BUSINESS = 'BUSINESS',
    MARKETING = 'MARKETING',
    PHOTOGRAPHY = 'PHOTOGRAPHY',
    MUSIC = 'MUSIC',
    HEALTH_FITNESS = 'HEALTH_FITNESS',
    LANGUAGE = 'LANGUAGE',
    PERSONAL_DEVELOPMENT = 'PERSONAL_DEVELOPMENT',
    TECHNOLOGY = 'TECHNOLOGY'
}

export interface Course {
    id: number;
    title: string;
    description: string;
    imageUrl?: string;
    instructor: {
        id: number;
        firstName: string;
        lastName: string;
    };
    price: number;
    published: boolean;
    createdAt: string;
    updatedAt?: string;
    category: CourseCategory;
    duration: number;
    level: CourseLevel;
    language: string;
    externalPurchaseUrl?: string;
    requirements: string[];
    whatYouWillLearn: string[];
    targetAudience: string[];
    certificateAvailable: boolean;
    isPreview: boolean;
}

export enum CourseLevel {
    BEGINNER = 'BEGINNER',
    INTERMEDIATE = 'INTERMEDIATE',
    ADVANCED = 'ADVANCED'
}

export interface CouponValidationRequest {
    couponCode: string;
    courseId: number;
    originalPrice: number;
    userId: number;
}

export interface CouponValidationResponse {
    valid: boolean;
    coupon?: Coupon;
    discountAmount: number;
    finalPrice: number;
    message?: string;
    errorCode?: string;
}

export interface TaxCalculation {
    originalPrice: number;
    discountAmount: number;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    finalPrice: number;
}

export interface CheckoutSummary {
    courseId: number;
    courseName: string;
    instructorId: number;
    instructorName: string;
    courseCategory?: CourseCategory;
    originalPrice: number;
    coupon?: Coupon;
    discountAmount: number;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    finalPrice: number;
    currency: string;
    userId: number;
    paymentMethod?: string;
}

// Yardımcı tip tanımlamaları
export interface CouponCreateRequest {
    code: string;
    discountType: DiscountType;
    discountValue: number;
    minimumAmount?: number;
    maximumDiscount?: number;
    validFrom: string;
    validUntil: string;
    usageLimit?: number;
    applicableCourseIds?: number[];
    applicableCategories?: CourseCategory[];
    description?: string;
}

export interface CouponUpdateRequest extends Partial<CouponCreateRequest> {
    id: number;
}

// Kupon listesi için özet bilgiler
export interface CouponSummary {
    id: number;
    code: string;
    discountType: DiscountType;
    discountValue: number;
    validFrom: string;
    validUntil: string;
    usedCount: number;
    usageLimit?: number;
    isActive: boolean;
    applicableCoursesCount: number;
    applicableCategoriesCount: number;
}

// API Response wrappers
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    errorCode?: string;
}

export interface PaginatedResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    currentPage: number;
    size: number;
    first: boolean;
    last: boolean;
}

// Error codes enum
export enum CouponErrorCode {
    COUPON_NOT_FOUND = 'COUPON_NOT_FOUND',
    COUPON_EXPIRED = 'COUPON_EXPIRED',
    USAGE_LIMIT_REACHED = 'USAGE_LIMIT_REACHED',
    NOT_APPLICABLE = 'NOT_APPLICABLE',
    MINIMUM_AMOUNT_NOT_MET = 'MINIMUM_AMOUNT_NOT_MET',
    COUPON_INACTIVE = 'COUPON_INACTIVE',
    INVALID_INSTRUCTOR = 'INVALID_INSTRUCTOR'
}