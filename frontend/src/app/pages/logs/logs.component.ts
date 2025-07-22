import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzCardModule } from 'ng-zorro-antd/card';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule, NzCardModule],
  template: `
    <div class="page-header">
      <h1>Журнал активности</h1>
    </div>
    <nz-card>
      <p>Страница журнала активности в разработке...</p>
    </nz-card>
  `
})
export class LogsComponent {}