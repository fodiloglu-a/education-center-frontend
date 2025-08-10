// teacher-subscription.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { TeacherSubscriptionService } from '../../services/teacher-subscription.service';
import { TokenService } from '../../../../core/services/token.service';

import {
  TeacherSubscriptionStatus,
  TeacherSubscriptionPlansResponse,
  TeacherSubscriptionPlan,
  TeacherSubscriptionCheckoutSummary,
  TeacherSubscriptionPaymentRequest,
  TeacherSubscriptionPaymentResponse,
  TeacherPlanType,
  TeacherSubscriptionPlanCard,
  TeacherSubscriptionFormData
} from '../../models/instructor.models';

import { catchError, finalize, takeUntil } from 'rxjs/operators';
import { of, Subject } from 'rxjs';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertDialogComponent } from '../../../../shared/components/alert-dialog/alert-dialog.component';

@Component({
  selector: 'app-teacher-subscription',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    LoadingSpinnerComponent,
    AlertDialogComponent
  ],
  templateUrl: './teacher-subscription.component.html',
  styleUrl: './teacher-subscription.component.css'
})
export class TeacherSubscriptionComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Subscription state
  subscriptionStatus: TeacherSubscriptionStatus | null = null;
  subscriptionPlans: TeacherSubscriptionPlansResponse | null = null;
  selectedPlan: TeacherSubscriptionPlan | null = null;
  checkoutSummary: TeacherSubscriptionCheckoutSummary | null = null;

  // Loading states
  isLoading: boolean = true;
  isLoadingPlans: boolean = false;
  isLoadingCheckout: boolean = false;
  isProcessingPayment: boolean = false;

  // Messages
  errorMessage: string | null = null;
  successMessage: string | null = null;
  warningMessage: string | null = null;

  // Form management
  subscriptionForm: FormGroup;
  showCustomAmountInput: boolean = false;

  // UI states
  activeStep: 'plans' | 'checkout' | 'payment' = 'plans';
  userId: number | null = null;

  // Plan cards for UI
  planCards: TeacherSubscriptionPlanCard[] = [];

  // Plan types enum for template
  readonly PlanType = TeacherPlanType;

  constructor(
      private teacherSubscriptionService: TeacherSubscriptionService,
      private tokenService: TokenService,
      private translate: TranslateService,
      private formBuilder: FormBuilder,
      private router: Router
  ) {
    this.subscriptionForm = this.initializeForm();
  }

  ngOnInit(): void {
    this.userId = this.tokenService.getUser()?.id || null;

    if (!this.userId) {
      this.errorMessage = this.translate.instant('USER_ID_NOT_FOUND');
      this.isLoading = false;
      return;
    }

    this.loadSubscriptionData();
    this.setupSubscriptionStatusListener();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): FormGroup {
    return this.formBuilder.group({
      selectedPlanType: ['', [Validators.required]],
      customAmount: [null], // Initial validators will be set dynamically
      agreedToTerms: [false, [Validators.requiredTrue]]
    });
  }

  private setupSubscriptionStatusListener(): void {
    this.teacherSubscriptionService.subscriptionStatus$
        .pipe(takeUntil(this.destroy$))
        .subscribe(status => {
          this.subscriptionStatus = status;

          // If user is already a teacher, show warning
          if (status?.isTeacher) {
            this.warningMessage = this.translate.instant('ALREADY_SUBSCRIBED_MESSAGE');
          }
        });
  }

  private loadSubscriptionData(): void {
    this.isLoading = true;
    this.errorMessage = null;

    Promise.all([
      this.checkSubscriptionStatus(),
      this.loadSubscriptionPlans()
    ]).finally(() => {
      this.isLoading = false;
    });
  }

  private checkSubscriptionStatus(): Promise<void> {
    return new Promise((resolve) => {
      this.teacherSubscriptionService.checkSubscriptionStatus().pipe(
          catchError(error => {
            console.error('Error checking subscription status:', error);
            return of(null);
          })
      ).subscribe(status => {
        this.subscriptionStatus = status;
        resolve();
      });
    });
  }

  private loadSubscriptionPlans(): Promise<void> {
    return new Promise((resolve) => {
      this.isLoadingPlans = true;

      this.teacherSubscriptionService.getSubscriptionPlans().pipe(
          catchError(error => {
            console.error('Error loading subscription plans:', error);
            this.errorMessage = this.translate.instant('PLANS_LOAD_FAILED');
            return of(null);
          }),
          finalize(() => {
            this.isLoadingPlans = false;
          })
      ).subscribe(plans => {
        this.subscriptionPlans = plans;
        if (plans) {
          this.setupPlanCards(plans);
        }
        resolve();
      });
    });
  }

  private setupPlanCards(plans: TeacherSubscriptionPlansResponse): void {
    this.planCards = [
      {
        plan: { ...plans.monthlyBasic, recommended: false, popular: false },
        isSelected: false,
        isLoading: false,
        buttonText: this.translate.instant('SELECT_PLAN'),
        buttonClass: 'btn-outline'
      },
      {
        plan: { ...plans.monthlyPremium, recommended: false, popular: true },
        isSelected: false,
        isLoading: false,
        buttonText: this.translate.instant('SELECT_PLAN'),
        buttonClass: 'btn-primary'
      },
      {
        plan: { ...plans.yearlyBasic, recommended: false, popular: false },
        isSelected: false,
        isLoading: false,
        buttonText: this.translate.instant('SELECT_PLAN'),
        buttonClass: 'btn-outline'
      },
      {
        plan: { ...plans.yearlyPremium, recommended: true, popular: false },
        isSelected: false,
        isLoading: false,
        buttonText: this.translate.instant('SELECT_PLAN'),
        buttonClass: 'btn-success'
      },
      {
        plan: { ...plans.custom, recommended: false, popular: false },
        isSelected: false,
        isLoading: false,
        buttonText: this.translate.instant('SELECT_PLAN'),
        buttonClass: 'btn-secondary'
      }
    ];
  }

  selectPlan(planCard: TeacherSubscriptionPlanCard): void {
    // Deselect all plans
    this.planCards.forEach(card => {
      card.isSelected = false;
      card.buttonText = this.translate.instant('SELECT_PLAN');
    });

    // Select current plan
    planCard.isSelected = true;
    planCard.buttonText = this.translate.instant('SELECTED');
    this.selectedPlan = planCard.plan;

    // Update form
    this.subscriptionForm.patchValue({
      selectedPlanType: planCard.plan.type
    });

    // Show custom amount input for custom plans
    this.showCustomAmountInput = planCard.plan.type === TeacherPlanType.CUSTOM;

    // Update validators based on plan type
    this.updateCustomAmountValidators(planCard.plan);

    this.clearMessages();
  }

  private updateCustomAmountValidators(plan: TeacherSubscriptionPlan): void {
    const customAmountControl = this.subscriptionForm.get('customAmount');

    if (this.showCustomAmountInput) {
      const validators = [
        Validators.required,
        Validators.min(plan.minPrice || 100),
        Validators.max(plan.maxPrice || 10000)
      ];
      customAmountControl?.setValidators(validators);
    } else {
      customAmountControl?.clearValidators();
      customAmountControl?.setValue(null);
    }

    customAmountControl?.updateValueAndValidity();
  }

  onCustomAmountChange(): void {
    const amount = this.subscriptionForm.get('customAmount')?.value;
    if (amount && this.selectedPlan) {
      const validation = this.teacherSubscriptionService.validateCustomAmount(amount);
      if (!validation.valid) {
        this.errorMessage = validation.message || '';
      } else {
        this.clearMessages();
      }
    }
  }

  proceedToCheckout(): void {
    if (!this.subscriptionForm.valid || !this.selectedPlan) {
      this.errorMessage = this.translate.instant('PLEASE_COMPLETE_FORM');
      return;
    }

    // Prevent if user is already a teacher
    if (this.subscriptionStatus?.isTeacher) {
      this.errorMessage = this.translate.instant('ALREADY_SUBSCRIBED_ERROR');
      return;
    }

    this.isLoadingCheckout = true;
    this.clearMessages();

    const formData = this.subscriptionForm.value as TeacherSubscriptionFormData;

    this.teacherSubscriptionService.getCheckoutSummary(
        formData.selectedPlanType,
        formData.customAmount
    ).pipe(
        catchError(error => {
          this.errorMessage = error.message || this.translate.instant('CHECKOUT_FAILED');
          return of(null);
        }),
        finalize(() => {
          this.isLoadingCheckout = false;
        })
    ).subscribe(summary => {
      if (summary) {
        this.checkoutSummary = summary;
        this.activeStep = 'checkout';
      }
    });
  }

  confirmPayment(): void {
    if (!this.selectedPlan || !this.checkoutSummary) {
      this.errorMessage = this.translate.instant('CHECKOUT_DATA_MISSING');
      return;
    }

    this.isProcessingPayment = true;
    this.clearMessages();

    const paymentRequest: TeacherSubscriptionPaymentRequest = {
      planType: this.checkoutSummary.planType,
      customAmount: this.subscriptionForm.get('customAmount')?.value
    };

    this.teacherSubscriptionService.initiateSubscriptionPayment(paymentRequest).pipe(
        catchError(error => {
          this.errorMessage = error.message || this.translate.instant('PAYMENT_INITIATION_FAILED');
          return of(null);
        }),
        finalize(() => {
          this.isProcessingPayment = false;
        })
    ).subscribe(paymentData => {
      if (paymentData) {
        this.handlePaymentInitiation(paymentData);
      }
    });
  }

  private handlePaymentInitiation(paymentData: TeacherSubscriptionPaymentResponse): void {
    try {
      // Submit LiqPay form
      this.teacherSubscriptionService.submitLiqPayForm(paymentData);
      this.activeStep = 'payment';
    } catch (error) {
      console.error('Error submitting LiqPay form:', error);
      this.errorMessage = this.translate.instant('PAYMENT_FORM_ERROR');
    }
  }

  goBackToPlans(): void {
    this.activeStep = 'plans';
    this.checkoutSummary = null;
    this.clearMessages();
  }

  goBackToCheckout(): void {
    this.activeStep = 'checkout';
    this.clearMessages();
  }

  setActiveStep(step: 'plans' | 'checkout' | 'payment'): void {
    this.activeStep = step;
    this.clearMessages();
  }

  clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
    this.warningMessage = null;
  }

  refreshData(): void {
    this.loadSubscriptionData();
  }

  // Template helper methods
  formatPrice(price: number): string {
    return this.teacherSubscriptionService.formatPlanPrice(price);
  }

  formatSavings(savings: number): string {
    return this.teacherSubscriptionService.formatSavings(savings);
  }

  isPlanSelected(planType: string): boolean {
    return this.selectedPlan?.type === planType;
  }

  canProceedToCheckout(): boolean {
    if (!this.subscriptionForm.valid || !this.selectedPlan) {
      return false;
    }

    if (this.showCustomAmountInput) {
      const amount = this.subscriptionForm.get('customAmount')?.value;
      const validation = this.teacherSubscriptionService.validateCustomAmount(amount);
      return validation.valid;
    }

    return true;
  }

  getPlanCardClass(planCard: TeacherSubscriptionPlanCard): string {
    let classes = 'plan-card';

    if (planCard.isSelected) {
      classes += ' selected';
    }

    if (planCard.plan.recommended) {
      classes += ' recommended';
    }

    if (planCard.plan.popular) {
      classes += ' popular';
    }

    return classes;
  }

  // Lifecycle and computed properties
  get currentYear(): number {
    return new Date().getFullYear();
  }

  get isAlreadySubscribed(): boolean {
    return this.subscriptionStatus?.isTeacher || false;
  }

  get selectedPlanType(): TeacherPlanType | null {
    return this.selectedPlan?.type as TeacherPlanType || null;
  }
}