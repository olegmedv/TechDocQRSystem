import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzCardModule } from 'ng-zorro-antd/card';

@Component({
  selector: 'app-download',
  standalone: true,
  imports: [CommonModule, NzCardModule],
  template: `
    <div class="page-header">
      <h1>Мои документы</h1>
    </div>
    <nz-card>
      <p>Страница управления документами в разработке...</p>
    </nz-card>
  `
})
export class DownloadComponent {}