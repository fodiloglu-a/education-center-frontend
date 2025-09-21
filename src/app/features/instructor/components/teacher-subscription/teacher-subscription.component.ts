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

  // UI states
  activeStep: 'plans' | 'checkout' | 'payment' = 'plans';
  userId: number | null = null;

  // Plan cards for UI - YENİ 3 PAKET YAPISI
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
    // Backend'den gelen planları kullanarak 3 paket oluştur
    // Eğer backend'den farklı bir yapı geliyorsa, manuel olarak oluştur

    this.planCards = [
      // BASIC PAKET - monthlyBasic'i kullan ama fiyatı güncelle
      {
        plan: {
          ...plans.monthlyBasic,
          type: TeacherPlanType.BASIC,
          price: 799, // YENİ FİYAT
          name: this.translate.instant('BASIC_PLAN'),
          description: this.translate.instant('BASIC_PLAN_DESC'),
          features: [
            this.translate.instant('FEATURE_1_COURSE'),
            this.translate.instant('FEATURE_BASIC_ANALYTICS'),
            this.translate.instant('FEATURE_STANDARD_SUPPORT'),
            this.translate.instant('FEATURE_COURSE_MANAGEMENT')
          ],
          recommended: false,
          popular: false
        },
        isSelected: false,
        isLoading: false,
        buttonText: this.translate.instant('SELECT_PLAN'),
        buttonClass: 'btn-outline'
      },
      // PROFESSIONAL PAKET - monthlyPremium'u kullan ama fiyatı güncelle
      {
        plan: {
          ...plans.monthlyPremium,
          type: TeacherPlanType.PROFESSIONAL,
          price: 1999, // YENİ FİYAT
          name: this.translate.instant('PROFESSIONAL_PLAN'),
          description: this.translate.instant('PROFESSIONAL_PLAN_DESC'),
          savings: 398, // 3x799 - 1999 = 398 UAH tasarruf
          features: [
            this.translate.instant('FEATURE_3_COURSES'),
            this.translate.instant('FEATURE_ADVANCED_ANALYTICS'),
            this.translate.instant('FEATURE_PRIORITY_SUPPORT'),
            this.translate.instant('FEATURE_CUSTOM_CERTIFICATES'),
            this.translate.instant('FEATURE_MARKETING_TOOLS')
          ],
          recommended: false,
          popular: true
        },
        isSelected: false,
        isLoading: false,
        buttonText: this.translate.instant('SELECT_PLAN'),
        buttonClass: 'btn-primary'
      },
      // PREMIUM PAKET - yearlyPremium'u kullan ama aylık olarak göster
      {
        plan: {
          ...plans.yearlyPremium,
          type: TeacherPlanType.YEARLY_PREMIUM, // Var olan enum'u kullan
          price: 2999, // YENİ FİYAT
          duration: this.translate.instant('MONTHLY'), // Aylık göster
          name: this.translate.instant('PREMIUM_PLAN'),
          description: this.translate.instant('PREMIUM_PLAN_DESC'),
          savings: 996, // 5x799 - 2999 = 996 UAH tasarruf
          features: [
            this.translate.instant('FEATURE_5_COURSES'),
            this.translate.instant('FEATURE_PREMIUM_ANALYTICS'),
            this.translate.instant('FEATURE_DEDICATED_SUPPORT'),
            this.translate.instant('FEATURE_CUSTOM_BRANDING'),
            this.translate.instant('FEATURE_ADVANCED_MARKETING'),
            this.translate.instant('FEATURE_API_ACCESS')
          ],
          recommended: true,
          popular: false
        },
        isSelected: false,
        isLoading: false,
        buttonText: this.translate.instant('SELECT_PLAN'),
        buttonClass: 'btn-success'
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

    this.clearMessages();
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
        undefined // customAmount yok artık
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
      planType: this.checkoutSummary.planType
      // customAmount artık yok
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
    return this.subscriptionForm.valid && this.selectedPlan !== null;
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

  protected readonly Math = Math;
}