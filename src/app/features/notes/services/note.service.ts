// src/app/features/notes/services/note.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {environment} from "../../../../environments/environment";
import {NoteRequest, NoteResponse} from "../models/note.models";

@Injectable({
    providedIn: 'root' // Bu servisin uygulamanın kök seviyesinde (singleton) sağlanacağını belirtir.
})
export class NoteService {
    private apiUrl = `${environment.apiUrl}/notes`; // Backend API URL'sini ortam değişkenlerinden alıyoruz

    constructor(private http: HttpClient) { }

    /**
     * Yeni bir not oluşturur.
     * @param noteRequest Not bilgilerini içeren NoteRequest nesnesi.
     * @returns Oluşturulan notun NoteResponse nesnesini içeren Observable.
     */
    createNote(noteRequest: NoteRequest): Observable<NoteResponse> {
        return this.http.post<NoteResponse>(this.apiUrl, noteRequest);
    }

    /**
     * Belirli bir ID'ye sahip notu günceller.
     * @param noteId Güncellenecek notun ID'si.
     * @param noteRequest Yeni not bilgilerini içeren NoteRequest nesnesi.
     * @returns Güncellenen notun NoteResponse nesnesini içeren Observable.
     */
    updateNote(noteId: number, noteRequest: NoteRequest): Observable<NoteResponse> {
        return this.http.put<NoteResponse>(`${this.apiUrl}/${noteId}`, noteRequest);
    }

    /**
     * Belirli bir ID'ye sahip notu siler.
     * @param noteId Silinecek notun ID'si.
     * @returns İşlemin başarılı olup olmadığını belirten Observable<void>.
     */
    deleteNote(noteId: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${noteId}`);
    }

    /**
     * Belirli bir ID'ye sahip notu getirir.
     * @param noteId Notun ID'si.
     * @returns Not bilgilerini içeren NoteResponse nesnesini içeren Observable.
     */
    getNoteById(noteId: number): Observable<NoteResponse> {
        return this.http.get<NoteResponse>(`${this.apiUrl}/${noteId}`);
    }

    /**
     * Belirli bir derse ait kullanıcının notlarını getirir.
     * @param lessonId Notların ait olduğu dersin ID'si.
     * @returns Belirli derse ait kullanıcının notlarının NoteResponse dizisini içeren Observable.
     */
    getUserNotesForLesson(lessonId: number): Observable<NoteResponse[]> {
        return this.http.get<NoteResponse[]>(`${this.apiUrl}/lesson/${lessonId}`);
    }

    /**
     * Belirli bir kullanıcıya ait tüm notları getirir. (Bu endpoint genellikle Admin paneli veya profil için kullanılır)
     * @param userId Notların ait olduğu kullanıcının ID'si.
     * @returns Kullanıcının tüm notlarının NoteResponse dizisini içeren Observable.
     */
    getAllNotesByUserId(userId: number): Observable<NoteResponse[]> {
        return this.http.get<NoteResponse[]>(`${this.apiUrl}/user/${userId}`);
    }
}