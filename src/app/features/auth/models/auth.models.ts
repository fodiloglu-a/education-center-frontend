// auth.models.ts

// Mevcut modeller
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
}

export interface JwtResponse {
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  expiresIn?: number;
}

// Yeni eklenen modeller

export interface UserProfile {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt?: string;
  phoneNumber?: string;
  profileImageUrl?: string;
  bio?: string;
  // Satın alınan kurs kategorileri için
  purchasedCourseCategories?: string[];
  totalPurchasedCourses?: number;
}

export interface TokenPayload {
  sub: number;          // User ID
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isEmailVerified?: boolean;
  createdAt?: string;
  exp: number;          // Expiration time
  iat: number;          // Issued at
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthError {
  status: number;
  message: string;
  translationKey: string;
  fieldErrors?: { [key: string]: string };
}