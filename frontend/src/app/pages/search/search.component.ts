import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzQRCodeModule } from 'ng-zorro-antd/qr-code';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { DocumentService } from '../../services/document.service';
import { Document } from '../../models/document.models';
import { AuthService } from '../../services/auth.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzCardModule,
    NzInputModule,
    NzButtonModule,
    NzIconModule,
    NzTableModule,
    NzTagModule,
    NzQRCodeModule,
    NzSpinModule,
    NzEmptyModule
  ],
  template: `
    <div class="page-header">
      <h1>Поиск документов</h1>
      <p>Найдите документы по содержимому, названию, тегам или краткому описанию</p>
    </div>

    <nz-card nzTitle="Поиск">
      <form nz-form [formGroup]="searchForm" (ngSubmit)="onSearch()">
        <div class="search-container">
          <nz-input-group [nzSuffix]="searchSuffix" [nzPrefix]="searchPrefix">
            <input 
              nz-input 
              formControlName="query" 
              placeholder="Введите текст для поиска..." 
              (keyup.enter)="onSearch()"
            />
          </nz-input-group>
          <ng-template #searchPrefix>
            <i nz-icon nzType="search"></i>
          </ng-template>
          <ng-template #searchSuffix>
            <button 
              nz-button 
              nzType="primary" 
              nzSize="small"
              [nzLoading]="searching"
              (click)="onSearch()"
              [disabled]="!searchForm.get('query')?.value?.trim()"
            >
              Поиск
            </button>
          </ng-template>
        </div>
      </form>
    </nz-card>

    <nz-card *ngIf="searchPerformed" [nzTitle]="getResultsTitle()" class="results-card">
      <nz-spin [nzSpinning]="searching">
        <nz-table #resultsTable [nzData]="searchResults" [nzLoading]="false" nzSize="middle" *ngIf="searchResults.length > 0">
          <thead>
            <tr>
              <th>Файл</th>
              <th>Размер</th>
              <th>Краткое описание</th>
              <th>Теги</th>
              <th>QR код</th>
              <th>Статистика</th>
              <th>Дата загрузки</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let doc of resultsTable.data">
              <td>
                <div class="file-info">
                  <i nz-icon nzType="file-text"></i>
                  <span class="filename" [innerHTML]="highlightSearchTerm(doc.filename, searchQuery)"></span>
                </div>
              </td>
              <td>{{ formatFileSize(doc.fileSize) }}</td>
              <td>
                <div class="summary-cell" [title]="doc.summary">
                  <span [innerHTML]="highlightSearchTerm(doc.summary || 'Обрабатывается...', searchQuery)"></span>
                </div>
              </td>
              <td>
                <div class="tags-container">
                  <nz-tag 
                    *ngFor="let tag of doc.tags" 
                    nzColor="blue"
                    [innerHTML]="highlightSearchTerm(tag, searchQuery)"
                  ></nz-tag>
                  <span *ngIf="!doc.tags || doc.tags.length === 0" class="no-tags">Нет тегов</span>
                </div>
              </td>
              <td>
                <nz-qrcode [nzValue]="doc.accessLink" [nzSize]="60"></nz-qrcode>
              </td>
              <td>
                <div class="stats">
                  <div><i nz-icon nzType="download"></i> {{ doc.downloadCount }}</div>
                  <div><i nz-icon nzType="qrcode"></i> {{ doc.qrGenerationCount }}</div>
                </div>
              </td>
              <td>{{ formatDate(doc.createdAt) }}</td>
              <td>
                <div class="action-buttons">
                  <button nz-button nzType="primary" nzSize="small" (click)="downloadDocument(doc.id)">
                    <i nz-icon nzType="download"></i>
                    Скачать
                  </button>
                  <button nz-button nzType="default" nzSize="small" (click)="generateQR(doc.id)">
                    <i nz-icon nzType="qrcode"></i>
                    QR
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </nz-table>

        <nz-empty 
          *ngIf="searchResults.length === 0 && !searching && searchPerformed"
          nzNotFoundImage="simple"
          nzNotFoundContent="Документы не найдены"
        >
          <span nz-empty-footer>
            Попробуйте изменить поисковый запрос
          </span>
        </nz-empty>
      </nz-spin>
    </nz-card>

    <nz-card *ngIf="!searchPerformed" nzTitle="Справка по поиску" class="help-card">
      <div class="search-help">
        <h4>Поиск выполняется по следующим полям:</h4>
        <ul>
          <li><strong>Название файла</strong> - имя загруженного документа</li>
          <li><strong>Извлеченный текст</strong> - текст, распознанный с помощью OCR</li>
          <li><strong>Теги</strong> - автоматически сгенерированные ключевые слова</li>
          <li><strong>Краткое описание</strong> - автоматически созданное резюме документа</li>
        </ul>
        
        <h4>Советы для эффективного поиска:</h4>
        <ul>
          <li>Используйте ключевые слова из содержимого документа</li>
          <li>Поиск не чувствителен к регистру</li>
          <li>Можно искать как по отдельным словам, так и по фразам</li>
          <li>Администраторы видят все документы, пользователи - только свои</li>
        </ul>
      </div>
    </nz-card>
  `,
  styles: [`
    .page-header {
      margin-bottom: 24px;
    }

    .page-header h1 {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 600;
    }

    .page-header p {
      margin: 0;
      color: #8c8c8c;
    }

    .search-container {
      width: 100%;
      max-width: 600px;
    }

    .results-card {
      margin-top: 24px;
    }

    .help-card {
      margin-top: 24px;
    }

    .search-help h4 {
      margin-top: 16px;
      margin-bottom: 8px;
      color: #262626;
    }

    .search-help ul {
      margin-bottom: 16px;
      padding-left: 20px;
    }

    .search-help li {
      margin-bottom: 4px;
      line-height: 1.6;
    }

    .file-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .filename {
      font-weight: 500;
    }

    .summary-cell {
      max-width: 250px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .tags-container {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .no-tags {
      color: #bfbfbf;
      font-style: italic;
    }

    .stats {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .stats div {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #666;
    }

    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .action-buttons button {
      width: 100%;
    }

    :host ::ng-deep .search-highlight {
      background-color: #fff2e6;
      color: #fa8c16;
      font-weight: 600;
    }

    :host ::ng-deep .ant-input-group .ant-input {
      padding-right: 80px;
    }

    :host ::ng-deep .ant-table-tbody > tr > td {
      vertical-align: top;
    }
  `]
})
export class SearchComponent implements OnInit {
  searchForm!: FormGroup;
  searchResults: Document[] = [];
  searching = false;
  searchPerformed = false;
  searchQuery = '';

  constructor(
    private fb: FormBuilder,
    private documentService: DocumentService,
    private authService: AuthService,
    private message: NzMessageService
  ) {}

  ngOnInit(): void {
    this.searchForm = this.fb.group({
      query: ['']
    });

    // Автопоиск при вводе (с задержкой)
    this.searchForm.get('query')?.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(query => {
      if (query && query.trim().length >= 2) {
        this.performSearch(query.trim());
      }
    });
  }

  onSearch(): void {
    const query = this.searchForm.get('query')?.value?.trim();
    if (query) {
      this.performSearch(query);
    }
  }

  private performSearch(query: string): void {
    if (query.length < 2) {
      this.message.warning('Введите минимум 2 символа для поиска');
      return;
    }

    this.searching = true;
    this.searchQuery = query;
    this.searchPerformed = true;

    this.documentService.searchDocuments(query).subscribe({
      next: (results) => {
        this.searchResults = results;
        this.searching = false;
      },
      error: (error) => {
        this.searching = false;
        this.message.error('Ошибка при поиске документов');
        console.error('Search error:', error);
      }
    });
  }

  downloadDocument(documentId: string): void {
    this.documentService.downloadDocument(documentId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'document';
        link.click();
        window.URL.revokeObjectURL(url);
        
        this.message.success('Файл скачан');
        
        // Обновляем статистику в результатах поиска
        this.performSearch(this.searchQuery);
      },
      error: (error) => {
        this.message.error('Ошибка при скачивании файла');
        console.error('Download error:', error);
      }
    });
  }

  generateQR(documentId: string): void {
    this.documentService.generateQR(documentId).subscribe({
      next: () => {
        this.message.success('QR код сгенерирован!');
        // Обновляем статистику в результатах поиска
        this.performSearch(this.searchQuery);
      },
      error: (error) => {
        this.message.error('Ошибка при генерации QR кода');
        console.error('QR generation error:', error);
      }
    });
  }

  getResultsTitle(): string {
    const count = this.searchResults.length;
    if (count === 0) {
      return `Результаты поиска "${this.searchQuery}"`;
    }
    return `Найдено документов: ${count} для запроса "${this.searchQuery}"`;
  }

  highlightSearchTerm(text: string, searchTerm: string): string {
    if (!text || !searchTerm) {
      return text || '';
    }

    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<span class="search-highlight">$1</span>');
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}