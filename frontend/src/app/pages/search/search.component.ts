import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzCardModule } from 'ng-zorro-antd/card';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, NzCardModule],
  template: `
    <div class="page-header">
      <h1>Поиск документов</h1>
    </div>
    <nz-card>
      <p>Страница поиска документов в разработке...</p>
    </nz-card>
  `
})
export class SearchComponent {}