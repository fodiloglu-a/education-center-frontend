// src/app/features/payment/models/coupon.model.ts

// =================== ENUMS ===================

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

export enum CourseLevel {
    BEGINNER = 'BEGINNER',
    INTERMEDIATE = 'INTERMEDIATE',
    ADVANCED = 'ADVANCED'
}

export enum CouponErrorCode {
    COUPON_NOT_FOUND = 'COUPON_NOT_FOUND',
    COUPON_EXPIRED = 'COUPON_EXPIRED',
    USAGE_LIMIT_REACHED = 'USAGE_LIMIT_REACHED',
    NOT_APPLICABLE = 'NOT_APPLICABLE',
    MINIMUM_AMOUNT_NOT_MET = 'MINIMUM_AMOUNT_NOT_MET',
    COUPON_INACTIVE = 'COUPON_INACTIVE',
    INVALID_INSTRUCTOR = 'INVALID_INSTRUCTOR',
    VALIDATION_ERROR = 'VALIDATION_ERROR'
}

// =================== INSTRUCTOR ===================

export interface InstructorProfile {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
}

// =================== COURSE ===================

export interface CourseInstructor {
    id: number;
    firstName: string;
    lastName: string;
}

export interface Course {
    id: number;
    title: string;
    description: string;
    imageUrl?: string;
    instructor: CourseInstructor;
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

// =================== COUPON ===================

export interface Coupon {
    id: number;
    code: string;
    instructor: InstructorProfile;
    discountType: DiscountType;
    discountValue: number;
    minimumAmount: number | null;
    maximumDiscount: number | null;
    validFrom: string;
    validUntil: string;
    usageLimit: number | null;
    usedCount: number;
    isActive: boolean;
    applicableCourses?: Course[];
    applicableCategories?: CourseCategory[];
    description: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CouponCreateRequest {
    code: string;
    discountType: DiscountType;
    discountValue: number;
    minimumAmount?: number | null;
    maximumDiscount?: number | null;
    validFrom: Date | string;
    validUntil: Date | string;
    usageLimit?: number | null;
    isActive?: boolean;
    applicableCourseIds?: number[];
    applicableCategories?: CourseCategory[];
    description?: string | null;
}

export interface CouponUpdateRequest {
    id: number;
    code?: string;
    discountType?: DiscountType;
    discountValue?: number;
    minimumAmount?: number | null;
    maximumDiscount?: number | null;
    validFrom?: Date | string;
    validUntil?: Date | string;
    usageLimit?: number | null;
    isActive?: boolean;
    applicableCourseIds?: number[];
    applicableCategories?: CourseCategory[];
    description?: string | null;
}

export interface CouponSummary {
    id: number;
    code: string;
    discountType: DiscountType;
    discountValue: number;
    validFrom: string;
    validUntil: string;
    usedCount: number;
    usageLimit: number | null;
    isActive: boolean;
    applicableCoursesCount: number;
    applicableCategoriesCount: number;
}

// =================== VALIDATION ===================

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
    errorCode?: CouponErrorCode;
}

// =================== TAX & CHECKOUT ===================

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
    finalPrice: number;
    currency: string;
    userId: number;
    paymentMethod?: string;
}

// =================== API RESPONSES ===================

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    errorCode?: CouponErrorCode;
    timestamp?: string;
}

export interface PaginatedResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    currentPage: number;
    size: number;
    first: boolean;
    last: boolean;
    empty: boolean;
}

// =================== UTILITY TYPES ===================

export interface CouponFilter {
    instructorId?: number;
    discountType?: DiscountType;
    isActive?: boolean;
    code?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
}

export interface CouponStats {
    totalCoupons: number;
    activeCoupons: number;
    totalUsage: number;
    averageDiscount: number;
}

export interface PaymentInitiationRequest {
    courseId: number;
    userId: number;
    couponCode?: string;
    discountAmount?: number;
}

export interface PaymentInitiationResponse {
    paymentId: string;
    redirectUrl: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
}

export enum PaymentStatus {
    PENDING = 'PENDING',
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED'
}

// =================== HELPER FUNCTIONS ===================

export function isCouponExpired(coupon: Coupon): boolean {
    return new Date(coupon.validUntil) < new Date();
}

export function isCouponActive(coupon: Coupon): boolean {
    const now = new Date();
    return coupon.isActive &&
        new Date(coupon.validFrom) <= now &&
        new Date(coupon.validUntil) >= now;
}

export function isCouponUsageLimitReached(coupon: Coupon): boolean {
    return coupon.usageLimit !== null &&
        coupon.usedCount >= coupon.usageLimit;
}

export function getCouponUsagePercentage(coupon: Coupon): number {
    if (!coupon.usageLimit) {
        return 0;
    }
    return Math.round((coupon.usedCount / coupon.usageLimit) * 100);
}

export function formatDiscountValue(coupon: Coupon): string {
    if (coupon.discountType === DiscountType.PERCENTAGE) {
        return `${coupon.discountValue}%`;
    }
    return `${coupon.discountValue} UAH`;
}

export function calculateDiscountAmount(
    coupon: Coupon,
    originalPrice: number
): number {
    let discount = 0;

    if (coupon.discountType === DiscountType.PERCENTAGE) {
        discount = (originalPrice * coupon.discountValue) / 100;
    } else if (coupon.discountType === DiscountType.FIXED_AMOUNT) {
        discount = coupon.discountValue;
    }

    if (coupon.maximumDiscount && discount > coupon.maximumDiscount) {
        discount = coupon.maximumDiscount;
    }

    if (discount > originalPrice) {
        discount = originalPrice;
    }

    return Math.round(discount * 100) / 100;
}

export function validateCouponForAmount(
    coupon: Coupon,
    amount: number
): boolean {
    return !coupon.minimumAmount || amount >= coupon.minimumAmount;
}

export function getCouponStatusColor(coupon: Coupon): string {
    if (!coupon.isActive) {
        return 'gray';
    }
    if (isCouponExpired(coupon)) {
        return 'red';
    }
    if (isCouponUsageLimitReached(coupon)) {
        return 'orange';
    }
    if (isCouponActive(coupon)) {
        return 'green';
    }
    return 'blue';
}

export function getCouponStatusText(coupon: Coupon): string {
    if (!coupon.isActive) {
        return 'Inactive';
    }
    if (isCouponExpired(coupon)) {
        return 'Expired';
    }
    if (isCouponUsageLimitReached(coupon)) {
        return 'Limit Reached';
    }
    if (isCouponActive(coupon)) {
        return 'Active';
    }
    return 'Pending';
}

export function formatCouponDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('uk-UA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}