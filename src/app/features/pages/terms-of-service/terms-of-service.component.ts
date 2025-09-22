import { Component, OnInit } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import {TranslatePipe} from "@ngx-translate/core";

@Component({
  selector: 'app-terms-of-service',
  templateUrl: './terms-of-service.component.html',
  standalone: true,
  imports: [
    TranslatePipe
  ],
  styleUrls: ['./terms-of-service.component.css']
})
export class TermsOfServiceComponent implements OnInit {

  constructor(
      private titleService: Title,
      private metaService: Meta
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('Kullanım Şartları | Academia');
    this.metaService.updateTag({
      name: 'description',
      content: 'Academia platformu kullanım şartları ve hizmet koşulları.'
    });
  }

  scrollToSection(sectionId: string): void {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth'
    });
  }
}