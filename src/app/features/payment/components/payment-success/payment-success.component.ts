// src/app/features/payment/components/payment-success/payment-success.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule
  ],
  template: `
    <div class="success-container">
      <div class="success-content">
        <div class="success-icon">
          <i class="fas fa-check-circle"></i>
        </div>
        
        <h1 class="success-title">{{ 'PAYMENT_SUCCESSFUL' | translate }}</h1>
        
        <p class="success-message">
          {{ 'PAYMENT_SUCCESS_DETAILS' | translate }}
        </p>

        <div class="order-info" *ngIf="orderId || courseId">
          <div class="info-item" *ngIf="orderId">
            <span class="label">{{ 'ORDER_ID' | translate }}:</span>
            <span class="value">{{ orderId }}</span>
          </div>
          <div class="info-item" *ngIf="courseId">
            <span class="label">{{ 'COURSE' | translate }}:</span>
            <span class="value">{{ courseTitle || courseId }}</span>
          </div>
        </div>

        <div class="next-steps">
          <h3>{{ 'WHAT_NEXT' | translate }}</h3>
          <ul>
            <li>
              <i class="fas fa-play-circle"></i>
              {{ 'START_LEARNING_IMMEDIATELY' | translate }}
            </li>
            <li>
              <i class="fas fa-download"></i>
              {{ 'ACCESS_COURSE_MATERIALS' | translate }}
            </li>
            <li>
              <i class="fas fa-certificate"></i>
              {{ 'EARN_CERTIFICATE' | translate }}
            </li>
          </ul>
        </div>

        <div class="action-buttons">
          <button 
            class="btn primary-btn" 
            (click)="goToCourse()"
            *ngIf="courseId">
            <i class="fas fa-play"></i>
            {{ 'START_LEARNING_NOW' | translate }}
          </button>
          
          <button 
            class="btn secondary-btn" 
            (click)="goToDashboard()">
            <i class="fas fa-tachometer-alt"></i>
            {{ 'GO_TO_DASHBOARD' | translate }}
          </button>
          
          <button 
            class="btn outline-btn" 
            (click)="goToCourses()">
            <i class="fas fa-book"></i>
            {{ 'BROWSE_MORE_COURSES' | translate }}
          </button>
        </div>

        <div class="support-info">
          <p>
            <i class="fas fa-question-circle"></i>
            {{ 'NEED_HELP' | translate }}
            <a href="/support" class="support-link">{{ 'CONTACT_SUPPORT' | translate }}</a>
          </p>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./payment-success.component.css']
})
export class PaymentSuccessComponent implements OnInit {
  orderId: string | null = null;
  courseId: number | null = null;
  courseTitle: string | null = null;

  constructor(
      private route: ActivatedRoute,
      private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.orderId = params['orderId'] || params['order_id'];
      this.courseId = params['courseId'] ? +params['courseId'] : null;
      this.courseTitle = params['courseTitle'] || null;
    });
  }

  goToCourse(): void {
    if (this.courseId) {
      this.router.navigate(['/courses', this.courseId, 'learn']);
    }
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  goToCourses(): void {
    this.router.navigate(['/courses']);
  }
}