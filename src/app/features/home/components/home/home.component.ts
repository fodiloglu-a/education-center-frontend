import { Component, OnInit } from '@angular/core';
import {CourseResponse} from "../../../courses/models/course.models";
import {CourseService} from "../../../courses/services/course.service";
import {CurrencyPipe, DecimalPipe, NgForOf} from "@angular/common";
import {TranslatePipe} from "@ngx-translate/core";
import {RouterLink} from "@angular/router";



@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  standalone: true,
  imports: [
    DecimalPipe,
    CurrencyPipe,
    NgForOf,
    TranslatePipe,
    RouterLink,

  ],
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  bestSellers: CourseResponse[] = [];
  errorMessage: string | null = null;


  constructor(private courseService: CourseService) { }

  ngOnInit(): void {
    this.getBestSellingCourses();
  }

  /**
   * CourseService üzerinden en çok satan kursları çeker ve bestSellers dizisine atar.
   */
  getBestSellingCourses(): void {
    this.courseService.getTopSellingCourses(5).subscribe({
      next: (courses) => {
        // API'den gelen veriyi bestSellers değişkenine atıyoruz.
        this.bestSellers = courses;
      },
      error: (err) => {
        // Hata durumunda hata mesajını kaydet.
        this.errorMessage = 'En çok satan kurslar yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.';
        console.error('En çok satan kurslar çekilirken hata:', err);
      }
    });
  }
}
