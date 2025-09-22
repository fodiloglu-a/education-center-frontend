import { Component, OnInit } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import {TranslatePipe} from "@ngx-translate/core";

@Component({
  selector: 'app-privacy-policy',
  templateUrl: './privacy-policy.component.html',
  standalone: true,
  imports: [
    TranslatePipe
  ],
  styleUrls: ['./privacy-policy.component.css']
})
export class PrivacyPolicyComponent implements OnInit {

  constructor(
      private titleService: Title,
      private metaService: Meta
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('Gizlilik Sözleşmesi | Academia');
    this.metaService.updateTag({
      name: 'description',
      content: 'Academia platformu gizlilik politikası ve kişisel verilerin korunması hakkında bilgiler.'
    });
  }

  scrollToSection(sectionId: string): void {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth'
    });
  }
}