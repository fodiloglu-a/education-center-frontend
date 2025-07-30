// src/app/features/notes/models/note.models.ts

export interface NoteRequest {
    lessonId: number;
    content: string;
}

export interface NoteResponse {
    id: number;
    userId: number;
    userName: string;
    lessonId: number;
    lessonTitle: string;
    courseId?: number; // Added for template compatibility and navigation
    courseTitle?: string; // Added for template compatibility and navigation
    content: string;
    createdAt: string;
    updatedAt?: string;
}