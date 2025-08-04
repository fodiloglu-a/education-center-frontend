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
  hourlyRate: number | null;
  teachingLanguage: string | null;
  responseTimeHours: number | null;
  studentCompletionRate: number | null;
  lastActiveDate: string | null;
  mediaFiles: string[];
}

// Eğitmen paneli için diğer modeller
export interface InstructorDashboardStats {
  totalCourses: number;
  totalStudents: number;
  averageRating: number;
  totalReviews: number;
}

export interface InstructorCourseResponse extends CourseResponse {
  totalLessons: number;
  totalEnrollments: number;
  courseAverageRating: number;
}

export interface InstructorReviewResponse extends ReviewResponse {
  // ReviewResponse yeterli olduğu için ek alan yok
}
