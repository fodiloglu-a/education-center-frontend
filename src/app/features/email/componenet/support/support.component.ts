import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SupportService } from '../../services/support.service';
import { SupportRequest } from '../../models/support-request.model';

/**
 * Support Component
 * Kullanıcıların destek talebi oluşturmasını sağlar
 * TR ve UK dil desteği ile
 */
@Component({
  selector: 'app-support',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './support.component.html',
  styleUrls: ['./support.component.css']
})
export class SupportComponent implements OnInit {
  supportForm!: FormGroup;
  isSubmitting = false;
  submitSuccess = false;
  submitError = false;
  errorMessage = '';
  successMessage = '';

  constructor(
      private fb: FormBuilder,
      private supportService: SupportService,
      private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  /**
   * Form'u başlatır ve validasyon kurallarını ayarlar
   */
  private initializeForm(): void {
    this.supportForm = this.fb.group({
      fullName: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100)
      ]],
      email: ['', [
        Validators.required,
        Validators.email
      ]],
      phoneNumber: ['', [
        Validators.required,
        Validators.pattern(/^[0-9]{10,15}$/)
      ]],
      subject: ['', [
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(200)
      ]],
      message: ['', [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(2000)
      ]]
    });
  }

  /**
   * Form alanı kontrolü - hata gösterimi için
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.supportForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  /**
   * Belirli bir alanın hata mesajını döndürür (i18n key olarak)
   */
  getFieldErrorKey(fieldName: string): string {
    const field = this.supportForm.get(fieldName);

    if (!field || !field.errors) {
      return '';
    }

    const errors = field.errors;
    const errorType = Object.keys(errors)[0];

    return `support.form.${fieldName}.errors.${errorType}`;
  }

  /**
   * Form gönderme işlemi
   */
  onSubmit(): void {
    // Form validasyonu
    if (this.supportForm.invalid) {
      this.supportForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.submitSuccess = false;
    this.submitError = false;
    this.errorMessage = '';

    const supportRequest: SupportRequest = this.supportForm.value;

    this.supportService.sendSupportRequest(supportRequest).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.submitSuccess = true;
        this.successMessage = response.message;
        this.supportForm.reset();

        // 5 saniye sonra başarı mesajını kaldır
        setTimeout(() => {
          this.submitSuccess = false;
        }, 5000);
      },
      error: (error) => {
        this.isSubmitting = false;
        this.submitError = true;
        this.errorMessage = error.message;

        // 5 saniye sonra hata mesajını kaldır
        setTimeout(() => {
          this.submitError = false;
        }, 5000);
      }
    });
  }

  /**
   * Form'u sıfırlar
   */
  resetForm(): void {
    this.supportForm.reset();
    this.submitSuccess = false;
    this.submitError = false;
    this.errorMessage = '';
    this.successMessage = '';
  }

  /**
   * Karakter sayacı - kalan karakter sayısını gösterir
   */
  getRemainingChars(fieldName: string, maxLength: number): number {
    const field = this.supportForm.get(fieldName);
    const currentLength = field?.value?.length || 0;
    return maxLength - currentLength;
  }
}