import { Component } from '@angular/core';
import { Button, Card, PageHeader } from '@by-iara/shared-ui';

@Component({
  selector: 'byiara-dashboard',
  imports: [Button, Card, PageHeader],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {}
