import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CheckoutService } from '../../../payment/services/checkout.service';
import { Coupon, DiscountType, CouponCreateRequest } from '../../../payment/models/coupon.model';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertDialogComponent } from '../../../../shared/components/alert-dialog/alert-dialog.component';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-coupon-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    LoadingSpinnerComponent,
    AlertDialogComponent,
    RouterLink
  ],
  templateUrl: './coupon-create.component.html',
  styleUrls: ['./coupon-create.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CouponCreateComponent implements OnInit, OnDestroy {
  couponForm!: FormGroup;
  isLoading = false;
  isSubmitting = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  instructorId: number | null = null;

  coupons: Coupon[] = [];

  discountTypes = [
    { label: 'PERCENTAGE', value: 'PERCENTAGE' },
    { label: 'FIXED_AMOUNT', value: 'FIXED_AMOUNT' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
      private router: Router,
      private checkoutService: CheckoutService,
      private authService: AuthService,
      private translate: TranslateService,
      private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.isLoading = true;
    this.authService.getCurrentUser().pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (user?.id) {
        this.instructorId = user.id;
        this.initializeForm();
        this.loadInstructorCoupons();
      } else {
        this.setError('Kupon oluşturmak için eğitmen girişi yapmalısınız.');
        this.isLoading = false;
      }
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInstructorCoupons(): void {
    if (!this.instructorId) {
      this.setError('Eğitmen kimliği bulunamadı.');
      this.isLoading = false;
      return;
    }

    this.checkoutService.getCouponsByInstructor(this.instructorId).pipe(
        takeUntil(this.destroy$)
    ).subscribe({
      next: (coupons) => {
        this.coupons = coupons;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('❌ Kuponları getirme hatası:', error);
        this.setError('Kuponlar yüklenirken bir hata oluştu.');
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private initializeForm(): void {
    this.couponForm = new FormGroup({
      code: new FormControl('', [Validators.required, Validators.maxLength(50), Validators.pattern(/^[A-Za-z0-9-_]+$/)]),
      discountType: new FormControl(this.discountTypes[0].value, Validators.required),
      discountValue: new FormControl(null, [Validators.required, Validators.min(0.01), Validators.max(100.00)]),
      minimumAmount: new FormControl(null, [Validators.min(0)]), // Yeni eklenen alan
      maximumDiscount: new FormControl(null, [Validators.min(0)]), // Yeni eklenen alan
      validFrom: new FormControl(this.getCurrentDateTimeString(), Validators.required),
      validUntil: new FormControl(null, Validators.required),
      usageLimit: new FormControl(null, [Validators.min(1)]),
      isActive: new FormControl(true),
      applicableCourseIds: new FormControl([]),
      applicableCategories: new FormControl([]),
      description: new FormControl('') // Yeni eklenen alan
    });

    this.setupFormListeners();
  }

  private setupFormListeners(): void {
    const discountTypeControl = this.couponForm.get('discountType');
    const discountValueControl = this.couponForm.get('discountValue');
    const validFromControl = this.couponForm.get('validFrom');
    const minimumAmountControl = this.couponForm.get('minimumAmount');
    const maximumDiscountControl = this.couponForm.get('maximumDiscount');

    // ... (Mevcut validasyon mantığı)
    if (discountTypeControl && discountValueControl) {
      discountTypeControl.valueChanges.pipe(
          takeUntil(this.destroy$)
      ).subscribe(value => {
        if (value === 'PERCENTAGE') {
          discountValueControl.setValidators([
            Validators.required,
            Validators.min(0.01),
            Validators.max(100.00)
          ]);
        } else if (value === 'FIXED_AMOUNT') {
          discountValueControl.setValidators([
            Validators.required,
            Validators.min(0.01)
          ]);
        }
        discountValueControl.updateValueAndValidity();
      });
    }

    if (validFromControl) {
      validFromControl.valueChanges.pipe(
          takeUntil(this.destroy$)
      ).subscribe(value => {
        this.couponForm.get('validUntil')?.updateValueAndValidity();
      });
    }

    const validUntilControl = this.couponForm.get('validUntil');
    if (validUntilControl) {
      validUntilControl.setValidators([
        Validators.required,
        (control) => {
          const validFrom = this.couponForm.get('validFrom')?.value;
          if (validFrom && control.value && new Date(control.value) <= new Date(validFrom)) {
            return { 'dateInvalid': true };
          }
          return null;
        }
      ]);
    }
    // ... (Mevcut validasyon mantığı sonu)
  }

  onSubmit(): void {
    if (this.couponForm.invalid) {
      this.setError('Lütfen tüm gerekli alanları doldurun ve hataları düzeltin.');
      return;
    }

    if (!this.instructorId) {
      this.setError('Eğitmen kimliği bulunamadı. Lütfen tekrar giriş yapın.');
      return;
    }

    this.isSubmitting = true;
    this.clearMessages();

    const formValue = this.couponForm.value;
    const newCoupon: CouponCreateRequest = {
      ...formValue,
      validFrom: new Date(formValue.validFrom),
      validUntil: new Date(formValue.validUntil)
    };

    this.checkoutService.createCouponForInstructor(this.instructorId, newCoupon).pipe(
        takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.setSuccess('Kupon başarıyla oluşturuldu!');
        this.couponForm.reset();
        this.loadInstructorCoupons();
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('❌ Kupon oluşturma hatası:', error);
        this.setError(error.message || 'Kupon oluşturma başarısız oldu. Lütfen tekrar deneyin.');
        this.cdr.markForCheck();
      }
    });
  }

  getCurrentDateTimeString(): string {
    const now = new Date();
    const pad = (num: number) => num < 10 ? '0' + num : num;
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  private setError(message: string): void {
    this.errorMessage = message;
    this.successMessage = null;
    this.isSubmitting = false;
  }

  private setSuccess(message: string): void {
    this.successMessage = message;
    this.errorMessage = null;
    this.isSubmitting = false;
  }

  clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
  }

  get code() { return this.couponForm.get('code'); }
  get discountValue() { return this.couponForm.get('discountValue'); }
  get validFrom() { return this.couponForm.get('validFrom'); }
  get validUntil() { return this.couponForm.get('validUntil'); }
  get minimumAmount() { return this.couponForm.get('minimumAmount'); }
  get maximumDiscount() { return this.couponForm.get('maximumDiscount'); }

  deleteCoupon(id: number) {
    this.checkoutService.deleteCoupon(id).subscribe({})
    location.reload()

  }
}