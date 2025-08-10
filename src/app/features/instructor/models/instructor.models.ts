// instructor.models.ts

import { CourseResponse } from '../../courses/models/course.models';
import { ReviewResponse } from '../../reviews/models/review.models';

// API'den dönen eğitmen profil verilerine karşılık gelen DTO
export interface InstructorProfileDTO {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string | null;
  bio: string | null;
  profileImageUrl: string | null;
  phoneNumber: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  jobTitle: string | null;
  company: string | null;
  yearsOfExperience: number | null;
  specializations: string[];
  certifications: string[];
  educationLevel: string | null;
  university: string | null;
  graduationYear: number | null;
  totalStudents: number;
  averageRating: number;
  totalCourses: number;
  totalReviews: number;
  socialLinks: string[];
  taughtCourses: CourseResponse[]; // Eğitmen tarafından verilen kursların listesi
  isFeatured: boolean;
  isVerified: boolean;
  isTeacher: boolean; // Eğitmen abonelik durumu
  hourlyRate: number | null;
  teachingLanguage: string | null;
  responseTimeHours: number | null;
  studentCompletionRate: number | null;
  lastActiveDate: string | null;
  mediaFiles: string[];
  // Eğitmen abonelik bilgileri
  subscriptionPlanType?: string | null;
  subscriptionStartDate?: string | null;
  subscriptionEndDate?: string | null;
  subscriptionOrderId?: string | null;
}

// Eğitmen paneli için diğer modeller
export interface InstructorDashboardStats {
  totalCourses: number;
  totalStudents: number;
  averageRating: number;
  totalReviews: number;
  // Abonelik durumu bilgileri
  isTeacher: boolean;
  canPublishCourses: boolean;
  subscriptionStatus?: TeacherSubscriptionStatus;
}

export interface InstructorCourseResponse extends CourseResponse {
  totalLessons: number;
  totalEnrollments: number;
  courseAverageRating: number;
}

export interface InstructorReviewResponse extends ReviewResponse {
  // ReviewResponse yeterli olduğu için ek alan yok
}

// Eğitmen Abonelik Modelleri
export interface TeacherSubscriptionStatus {
  userId: number;
  isTeacher: boolean;
  canPublishCourses: boolean;
  needsSubscription: boolean;
  message: string;
  subscriptionPlan?: string;
  subscriptionEndDate?: string;
  daysUntilExpiry?: number;
}

export interface TeacherSubscriptionPlan {
  type: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  duration: string;
  features: string[];
  savings?: number; // Yıllık planlar için tasarruf miktarı
  minPrice?: number; // Custom plan için
  maxPrice?: number; // Custom plan için
  recommended?: boolean; // Önerilen plan
  popular?: boolean; // Popüler plan
}

export interface TeacherSubscriptionPlansResponse {
  monthlyBasic: TeacherSubscriptionPlan;
  monthlyPremium: TeacherSubscriptionPlan;
  yearlyBasic: TeacherSubscriptionPlan;
  yearlyPremium: TeacherSubscriptionPlan;
  custom: TeacherSubscriptionPlan;
}

export interface TeacherSubscriptionCheckoutSummary {
  userId: number;
  userEmail: string;
  userName: string;
  planType: string;
  planName: string;
  planDuration: string;
  originalPrice: number;
  finalPrice: number;
  currency: string;
  hasVat: boolean;
}

export interface TeacherSubscriptionPaymentRequest {
  planType: string;
  customAmount?: number; // CUSTOM plan için
}

export interface TeacherSubscriptionPaymentResponse {
  data: string; // LiqPay data
  signature: string; // LiqPay signature
  success: string;
  message: string;
  planType: string;
  planName: string;
  originalPrice: string;
  finalPrice: string;
  currency: string;
}

export interface TeacherSubscriptionCallbackData {
  status: string;
  order_id: string;
  amount?: string;
  currency?: string;
  description?: string;
}

export interface TeacherSubscriptionCallbackResponse {
  success: boolean;
  message: string;
  orderId?: string;
  amount?: string;
  currency?: string;
}

// Eğitmen Abonelik Plan Tipleri
export enum TeacherPlanType {
  MONTHLY_BASIC = 'MONTHLY_BASIC',
  MONTHLY_PREMIUM = 'MONTHLY_PREMIUM',
  YEARLY_BASIC = 'YEARLY_BASIC',
  YEARLY_PREMIUM = 'YEARLY_PREMIUM',
  CUSTOM = 'CUSTOM'
}

// Eğitmen Abonelik Durumu
export enum TeacherSubscriptionStatusType {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  EXPIRING_SOON = 'EXPIRING_SOON', // 7 gün kala
  INACTIVE = 'INACTIVE'
}

// UI için yardımcı interface'ler
export interface TeacherSubscriptionPlanCard {
  plan: TeacherSubscriptionPlan;
  isSelected: boolean;
  isLoading: boolean;
  buttonText: string;
  buttonClass: string;
}

export interface TeacherSubscriptionFormData {
  selectedPlanType: TeacherPlanType;
  customAmount?: number;
  agreedToTerms: boolean;
}

// Dashboard bildirimleri için
export interface TeacherSubscriptionNotification {
  type: 'warning' | 'info' | 'success' | 'error';
  title: string;
  message: string;
  actionText?: string;
  actionRoute?: string;
  dismissible: boolean;
}