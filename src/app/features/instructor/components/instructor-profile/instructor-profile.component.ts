import { Component, OnInit } from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import { CommonModule } from '@angular/common';
import { InstructorProfileDTO } from "../../../user/models/user.models";
import { UserService } from "../../../user/services/user.service";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import {CourseResponse} from "../../../courses/models/course.models";


@Component({
  selector: 'app-instructor-profile',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    RouterLink,
    // Diğer gerekli Angular Material importları kaldırıldı
  ],
  templateUrl: './instructor-profile.component.html',
  styleUrls: ['./instructor-profile.component.scss']
})
export class InstructorProfileComponent implements OnInit {
  instructorProfile: InstructorProfileDTO | null = null;
  loading = true;
  error = false;
  instructorId!: number;
  taughtCourses: CourseResponse[] = [];

  constructor(
      private route: ActivatedRoute,
      private router: Router,
      private userService: UserService,
      private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.instructorId = +params['id'];
      if (this.instructorId) {
        this.loadInstructorProfile();
      } else {
        this.error = true;
        this.loading = false;
      }
    });
  }

  loadInstructorProfile(): void {
    this.loading = true;
    this.error = false;

    this.userService.getInstructorProfile(this.instructorId).subscribe({
      next: (profile) => {
        console.error('Eğitmen PROFILE:', profile);
        this.instructorProfile = profile;
        this.taughtCourses = profile.taughtCourses || []; // Kursları doğrudan DTO'dan al
        this.loading = false;
      },
      error: (error) => {
        console.error('Eğitmen profili yüklenirken hata:', error);
        this.error = true;
        this.loading = false;
      }
    });
  }

  getStarArray(rating: number | null): boolean[] {
    if (rating === null) {
      return [false, false, false, false, false];
    }
    const fullStars = Math.floor(Math.max(0, Math.min(5, rating)));
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(i < fullStars);
    }
    return stars;
  }

  formatPrice(price: number): string {
    if (price === 0) {
      return this.translate.instant('FREE');
    }
    const lang = this.translate.currentLang || 'en';
    const currency = lang === 'tr' ? 'TRY' : lang === 'uk' ? 'UAH' : 'USD';
    const locale = lang === 'tr' ? 'tr-TR' : lang === 'uk' ? 'uk-UA' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price);
  }

  openSocialLink(link: string): void {
    if (link.startsWith('http://') || link.startsWith('https://')) {
      window.open(link, '_blank');
    } else {
      window.open(`https://${link}`, '_blank');
    }
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  sendEmail(): void {
    if (this.instructorProfile?.email) {
      window.location.href = `mailto:${this.instructorProfile.email}`;
    }
  }
}
