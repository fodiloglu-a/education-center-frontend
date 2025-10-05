import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { CheckoutService } from '../../../payment/services/checkout.service';
import {
  Coupon,
  DiscountType,
  CouponCreateRequest,
  isCouponExpired,
  isCouponActive,
  getCouponStatusColor,
  getCouponStatusText
} from '../../../payment/models/coupon.model';
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
  isDeletingCouponId: number | null = null;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  instructorId: number | null = null;
  coupons: Coupon[] = [];

  readonly discountTypes = [
    { label: 'PERCENTAGE', value: DiscountType.PERCENTAGE },
    { label: 'FIXED_AMOUNT', value: DiscountType.FIXED_AMOUNT }
  ];

  private readonly destroy$ = new Subject<void>();

  constructor(
      private readonly router: Router,
      private readonly checkoutService: CheckoutService,
      private readonly authService: AuthService,
      private readonly translate: TranslateService,
      private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =================== INITIALIZATION ===================

  private loadCurrentUser(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.authService.getCurrentUser()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (user) => {
            if (user?.id) {
              this.instructorId = user.id;
              this.initializeForm();
              this.loadInstructorCoupons();
            } else {
              this.handleError('User authentication required to create coupons');
              this.isLoading = false;
            }
            this.cdr.markForCheck();
          },
          error: () => {
            this.handleError('Failed to load user information');
            this.isLoading = false;
            this.cdr.markForCheck();
          }
        });
  }

  private loadInstructorCoupons(): void {
    if (!this.instructorId) {
      this.handleError('Instructor ID not found');
      this.isLoading = false;
      return;
    }

    this.checkoutService.getCouponsByInstructor(this.instructorId)
        .pipe(
            takeUntil(this.destroy$),
            finalize(() => {
              this.isLoading = false;
              this.cdr.markForCheck();
            })
        )
        .subscribe({
          next: (coupons) => {
            this.coupons = coupons || [];
            console.log('Coupons loaded:', this.coupons.length);
          },
          error: (error) => {
            console.error('Failed to load coupons:', error);
            this.handleError('Failed to load coupons');
          }
        });
  }

  private initializeForm(): void {
    const now = this.getCurrentDateTimeString();

    this.couponForm = new FormGroup({
      code: new FormControl('', [
        Validators.required,
        Validators.maxLength(50),
        Validators.pattern(/^[A-Za-z0-9-_]+$/)
      ]),
      discountType: new FormControl(this.discountTypes[0].value, Validators.required),
      discountValue: new FormControl(null, [
        Validators.required,
        Validators.min(0.01)
      ]),
      minimumAmount: new FormControl(null, [Validators.min(0)]),
      maximumDiscount: new FormControl(null, [Validators.min(0)]),
      validFrom: new FormControl(now, Validators.required),
      validUntil: new FormControl(null, [
        Validators.required,
        this.validUntilValidator.bind(this)
      ]),
      usageLimit: new FormControl(null, [Validators.min(1)]),
      isActive: new FormControl(true),
      applicableCourseIds: new FormControl([]),
      applicableCategories: new FormControl([]),
      description: new FormControl('', Validators.maxLength(500))
    });

    this.setupFormListeners();
  }

  private setupFormListeners(): void {
    const discountTypeControl = this.couponForm.get('discountType');
    const discountValueControl = this.couponForm.get('discountValue');
    const validFromControl = this.couponForm.get('validFrom');
    const validUntilControl = this.couponForm.get('validUntil');

    if (discountTypeControl && discountValueControl) {
      discountTypeControl.valueChanges
          .pipe(takeUntil(this.destroy$))
          .subscribe((value: DiscountType) => {
            this.updateDiscountValueValidators(value, discountValueControl);
          });
    }

    if (validFromControl && validUntilControl) {
      validFromControl.valueChanges
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => {
            validUntilControl.updateValueAndValidity({ emitEvent: false });
          });
    }
  }

  private updateDiscountValueValidators(discountType: DiscountType, control: AbstractControl): void {
    if (discountType === DiscountType.PERCENTAGE) {
      control.setValidators([
        Validators.required,
        Validators.min(0.01),
        Validators.max(100)
      ]);
    } else if (discountType === DiscountType.FIXED_AMOUNT) {
      control.setValidators([
        Validators.required,
        Validators.min(0.01),
        Validators.max(50000)
      ]);
    }
    control.updateValueAndValidity();
  }

  private validUntilValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value || !this.couponForm) {
      return null;
    }

    const validFrom = this.couponForm.get('validFrom')?.value;
    if (!validFrom) {
      return null;
    }

    const fromDate = new Date(validFrom);
    const untilDate = new Date(control.value);

    if (untilDate <= fromDate) {
      return { invalidDateRange: true };
    }

    return null;
  }

  // =================== FORM SUBMISSION ===================

  onSubmit(): void {
    if (this.couponForm.invalid) {
      this.markFormGroupTouched(this.couponForm);
      this.handleError('Please fill all required fields correctly');
      return;
    }

    if (!this.instructorId) {
      this.handleError('Instructor ID not found. Please login again');
      return;
    }

    this.isSubmitting = true;
    this.clearMessages();
    this.cdr.markForCheck();

    const couponRequest = this.buildCouponRequest();

    this.checkoutService.createCouponForInstructor(this.instructorId, couponRequest)
        .pipe(
            takeUntil(this.destroy$),
            finalize(() => {
              this.isSubmitting = false;
              this.cdr.markForCheck();
            })
        )
        .subscribe({
          next: (response) => {
            console.log('Coupon created successfully:', response);
            this.handleSuccess('Coupon created successfully!');
            this.resetForm();
            this.loadInstructorCoupons();
          },
          error: (error) => {
            console.error('Failed to create coupon:', error);
            this.handleError(error.message || 'Failed to create coupon. Please try again');
          }
        });
  }

  private buildCouponRequest(): CouponCreateRequest {
    const formValue = this.couponForm.value;

    return {
      code: formValue.code?.trim().toUpperCase(),
      discountType: formValue.discountType,
      discountValue: Number(formValue.discountValue),
      minimumAmount: formValue.minimumAmount ? Number(formValue.minimumAmount) : null,
      maximumDiscount: formValue.maximumDiscount ? Number(formValue.maximumDiscount) : null,
      validFrom: new Date(formValue.validFrom).toISOString(),
      validUntil: new Date(formValue.validUntil).toISOString(),
      usageLimit: formValue.usageLimit ? Number(formValue.usageLimit) : null,
      isActive: formValue.isActive ?? true,
      applicableCourseIds: formValue.applicableCourseIds || [],
      applicableCategories: formValue.applicableCategories || [],
      description: formValue.description?.trim() || null
    };
  }

  // =================== COUPON OPERATIONS ===================

  deleteCoupon(id: number): void {
    if (!confirm(this.translate.instant('CONFIRM_DELETE_COUPON'))) {
      return;
    }

    this.isDeletingCouponId = id;
    this.clearMessages();
    this.cdr.markForCheck();

    this.checkoutService.deleteCoupon(id)
        .pipe(
            takeUntil(this.destroy$),
            finalize(() => {
              this.isDeletingCouponId = null;
              this.cdr.markForCheck();
            })
        )
        .subscribe({
          next: () => {
            console.log('Coupon deleted successfully:', id);
            this.handleSuccess('Coupon deleted successfully');
            this.coupons = this.coupons.filter(c => c.id !== id);
            this.cdr.markForCheck();
          },
          error: (error) => {
            console.error('Failed to delete coupon:', error);
            this.handleError(error.message || 'Failed to delete coupon');
          }
        });
  }

  // =================== COUPON STATUS HELPERS ===================

  isCouponExpired(coupon: Coupon): boolean {
    return isCouponExpired(coupon);
  }

  isCouponActive(coupon: Coupon): boolean {
    return isCouponActive(coupon);
  }

  getCouponStatusColor(coupon: Coupon): string {
    return getCouponStatusColor(coupon);
  }

  getCouponStatusText(coupon: Coupon): string {
    return getCouponStatusText(coupon);
  }

  // =================== UTILITY METHODS ===================

  getCurrentDateTimeString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private resetForm(): void {
    this.couponForm.reset({
      discountType: this.discountTypes[0].value,
      validFrom: this.getCurrentDateTimeString(),
      isActive: true,
      applicableCourseIds: [],
      applicableCategories: []
    });
    this.couponForm.markAsUntouched();
    this.couponForm.markAsPristine();
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // =================== MESSAGE HANDLING ===================

  private handleError(message: string): void {
    this.errorMessage = message;
    this.successMessage = null;
    this.cdr.markForCheck();
  }

  private handleSuccess(message: string): void {
    this.successMessage = message;
    this.errorMessage = null;
    this.cdr.markForCheck();
  }

  clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
    this.cdr.markForCheck();
  }

  // =================== FORM GETTERS ===================

  get code(): AbstractControl | null {
    return this.couponForm?.get('code') || null;
  }

  get discountType(): AbstractControl | null {
    return this.couponForm?.get('discountType') || null;
  }

  get discountValue(): AbstractControl | null {
    return this.couponForm?.get('discountValue') || null;
  }

  get validFrom(): AbstractControl | null {
    return this.couponForm?.get('validFrom') || null;
  }

  get validUntil(): AbstractControl | null {
    return this.couponForm?.get('validUntil') || null;
  }

  get minimumAmount(): AbstractControl | null {
    return this.couponForm?.get('minimumAmount') || null;
  }

  get maximumDiscount(): AbstractControl | null {
    return this.couponForm?.get('maximumDiscount') || null;
  }

  get usageLimit(): AbstractControl | null {
    return this.couponForm?.get('usageLimit') || null;
  }

  get description(): AbstractControl | null {
    return this.couponForm?.get('description') || null;
  }

  // =================== VALIDATION HELPERS ===================

  isDeleting(couponId: number): boolean {
    return this.isDeletingCouponId === couponId;
  }

  hasError(controlName: string): boolean {
    if (!this.couponForm) {
      return false;
    }
    const control = this.couponForm.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  getErrorMessage(controlName: string): string {
    if (!this.couponForm) {
      return '';
    }

    const control = this.couponForm.get(controlName);
    if (!control || !control.errors) {
      return '';
    }

    const errors = control.errors;

    if (errors['required']) {
      return 'FIELD_REQUIRED';
    }
    if (errors['maxlength']) {
      return 'FIELD_TOO_LONG';
    }
    if (errors['pattern']) {
      return 'FIELD_INVALID_FORMAT';
    }
    if (errors['min']) {
      return 'FIELD_MIN_VALUE';
    }
    if (errors['max']) {
      return 'FIELD_MAX_VALUE';
    }
    if (errors['invalidDateRange']) {
      return 'VALID_UNTIL_AFTER_VALID_FROM';
    }

    return 'FIELD_INVALID';
  }
}