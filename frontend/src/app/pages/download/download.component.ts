import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzQRCodeModule } from 'ng-zorro-antd/qr-code';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { DocumentService } from '../../services/document.service';
import { Document } from '../../models/document.models';
import { AuthService } from '../../services/auth.service';
import { SignalRService, DocumentProcessingNotification } from '../../services/signalr.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-download',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzCardModule,
    NzTableModule,
    NzButtonModule,
    NzIconModule,
    NzTagModule,
    NzQRCodeModule,
    NzPopconfirmModule,
    NzSpinModule,
    NzCheckboxModule
  ],
  template: `
    <div class="page-header">
      <h1>Мои документы</h1>
      <p>Управление загруженными документами</p>
    </div>

    <nz-card nzTitle="Список документов">
      <div class="table-actions" *ngIf="documents.length > 0">
        <label nz-checkbox [(ngModel)]="allSelected" (ngModelChange)="onAllSelectedChange($event)">
          Выбрать все
        </label>
        <button 
          nz-button 
          nzType="primary" 
          [disabled]="selectedDocuments.size === 0"
          (click)="printSelectedQRCodes()"
        >
          <i nz-icon nzType="printer"></i>
          Печать QR ({{ selectedDocuments.size }})
        </button>
      </div>

      <nz-table #documentsTable [nzData]="documents" [nzLoading]="loading" nzSize="middle">
        <thead>
          <tr>
            <th nzWidth="50px"></th>
            <th>Файл</th>
            <th>Размер</th>
            <th>Краткое описание</th>
            <th>Теги</th>
            <th>QR код</th>
            <th>Статистика</th>
            <th>Дата загрузки</th>
            <th>Последний доступ</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let doc of documentsTable.data">
            <td>
              <label nz-checkbox [ngModel]="selectedDocuments.has(doc.id)" (ngModelChange)="onDocumentSelectionChange(doc.id, $event)"></label>
            </td>
            <td>
              <div class="file-info">
                <i nz-icon nzType="file-text"></i>
                <span class="filename">{{ doc.filename }}</span>
              </div>
            </td>
            <td>{{ formatFileSize(doc.fileSize) }}</td>
            <td>
              <div class="summary-cell" [title]="doc.summary">
                {{ doc.summary || 'Обрабатывается...' }}
              </div>
            </td>
            <td>
              <nz-tag *ngFor="let tag of doc.tags" nzColor="blue">{{ tag }}</nz-tag>
              <span *ngIf="!doc.tags || doc.tags.length === 0" class="no-tags">Нет тегов</span>
            </td>
            <td>
              <nz-qrcode [nzValue]="doc.accessLink" [nzSize]="80"></nz-qrcode>
            </td>
            <td>
              <div class="stats">
                <div><i nz-icon nzType="download"></i> {{ doc.downloadCount }}</div>
                <div><i nz-icon nzType="qrcode"></i> {{ doc.qrGenerationCount }}</div>
              </div>
            </td>
            <td>{{ formatDate(doc.createdAt) }}</td>
            <td>
              <span *ngIf="doc.lastAccessedAt; else noAccess">
                {{ formatDate(doc.lastAccessedAt) }}
              </span>
              <ng-template #noAccess>
                <span class="no-access">Не было</span>
              </ng-template>
            </td>
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
                <button nz-button nzType="default" nzSize="small" (click)="copyQRLink(doc.accessLink)">
                  <i nz-icon nzType="copy"></i>
                  Копировать
                </button>
                <button nz-button nzType="default" nzSize="small" (click)="printSingleQR(doc)">
                  <i nz-icon nzType="printer"></i>
                  Печать
                </button>
                <button 
                  nz-button 
                  nzType="primary" 
                  nzDanger 
                  nzSize="small" 
                  nz-popconfirm
                  nzPopconfirmTitle="Удалить документ?"
                  nzPopconfirmPlacement="top"
                  (nzOnConfirm)="deleteDocument(doc.id)"
                >
                  <i nz-icon nzType="delete"></i>
                  Удалить
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </nz-table>

      <div *ngIf="documents.length === 0 && !loading" class="empty-state">
        <i nz-icon nzType="inbox" class="empty-icon"></i>
        <h3>Нет документов</h3>
        <p>Загрузите документы на странице "Загрузка"</p>
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

    .no-access {
      color: #bfbfbf;
      font-style: italic;
    }

    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .action-buttons button {
      width: 100%;
    }

    .empty-state {
      text-align: center;
      padding: 48px 24px;
      color: #8c8c8c;
    }

    .empty-icon {
      font-size: 48px;
      color: #d9d9d9;
      margin-bottom: 16px;
    }

    .empty-state h3 {
      margin: 16px 0 8px 0;
      font-size: 16px;
      color: #595959;
    }

    .empty-state p {
      margin: 0;
    }

    :host ::ng-deep .ant-table-tbody > tr > td {
      vertical-align: top;
    }

    .table-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding: 12px;
      background: #fafafa;
      border: 1px solid #d9d9d9;
      border-radius: 6px;
    }

    .table-actions button {
      margin-left: 8px;
    }
  `]
})
export class DownloadComponent implements OnInit, OnDestroy {
  documents: Document[] = [];
  loading = false;
  selectedDocuments = new Set<string>();
  allSelected = false;
  private signalRSubscription?: Subscription;

  constructor(
    private documentService: DocumentService,
    private authService: AuthService,
    private message: NzMessageService,
    private signalRService: SignalRService
  ) {}

  ngOnInit(): void {
    this.loadDocuments();
    this.subscribeToSignalR();
  }

  ngOnDestroy(): void {
    if (this.signalRSubscription) {
      this.signalRSubscription.unsubscribe();
    }
  }

  private subscribeToSignalR(): void {
    this.signalRSubscription = this.signalRService.documentUpdates$.subscribe(
      (notification: DocumentProcessingNotification | null) => {
        if (notification) {
          this.handleDocumentUpdate(notification);
        }
      }
    );
  }

  private handleDocumentUpdate(notification: DocumentProcessingNotification): void {
    // Find and update the document in the list
    const documentIndex = this.documents.findIndex(doc => doc.id === notification.documentId);
    if (documentIndex !== -1) {
      const document = this.documents[documentIndex];
      
      if (notification.status === 'completed') {
        document.summary = notification.summary || document.summary;
        document.tags = notification.tags || document.tags;
      } else if (notification.status === 'failed') {
        document.summary = 'Ошибка обработки: ' + (notification.error || 'Неизвестная ошибка');
        document.tags = ['Ошибка'];
      }
      
      // Trigger change detection
      this.documents = [...this.documents];
    }
  }

  private loadDocuments(): void {
    this.loading = true;
    
    this.documentService.getMyDocuments().subscribe({
      next: (documents) => {
        this.documents = documents;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.message.error('Ошибка при загрузке документов');
        console.error('Load documents error:', error);
      }
    });
  }

  downloadDocument(documentId: string): void {
    this.documentService.downloadDocument(documentId).subscribe({
      next: (blob) => {
        // Создаем ссылку для скачивания
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'document';
        link.click();
        window.URL.revokeObjectURL(url);
        
        // Обновляем статистику
        this.loadDocuments();
        this.message.success('Файл скачан');
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
        this.loadDocuments(); // Обновляем статистику
      },
      error: (error) => {
        this.message.error('Ошибка при генерации QR кода');
        console.error('QR generation error:', error);
      }
    });
  }

  deleteDocument(documentId: string): void {
    this.documentService.deleteDocument(documentId).subscribe({
      next: () => {
        this.message.success('Документ удален');
        this.loadDocuments(); // Перезагружаем список
      },
      error: (error) => {
        this.message.error('Ошибка при удалении документа');
        console.error('Delete error:', error);
      }
    });
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

  onAllSelectedChange(checked: boolean): void {
    if (checked) {
      this.documents.forEach(doc => this.selectedDocuments.add(doc.id));
    } else {
      this.selectedDocuments.clear();
    }
    this.updateAllSelectedState();
  }

  onDocumentSelectionChange(docId: string, checked: boolean): void {
    if (checked) {
      this.selectedDocuments.add(docId);
    } else {
      this.selectedDocuments.delete(docId);
    }
    this.updateAllSelectedState();
  }

  private updateAllSelectedState(): void {
    this.allSelected = this.documents.length > 0 && this.selectedDocuments.size === this.documents.length;
  }

  copyQRLink(accessLink: string): void {
    navigator.clipboard.writeText(accessLink).then(() => {
      this.message.success('Ссылка скопирована в буфер обмена');
    }).catch(() => {
      this.message.error('Не удалось скопировать ссылку');
    });
  }

  printSingleQR(document: Document): void {
    this.printQRCodes([document]);
  }

  printSelectedQRCodes(): void {
    const selectedDocs = this.documents.filter(doc => this.selectedDocuments.has(doc.id));
    if (selectedDocs.length === 0) {
      this.message.warning('Выберите документы для печати');
      return;
    }
    this.printQRCodes(selectedDocs);
  }

  private printQRCodes(documents: Document[]): void {
    // Create print window with QR codes
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.message.error('Не удалось открыть окно печати');
      return;
    }

    const printContent = this.generatePrintContent(documents);
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for images to load then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 1000);

    this.message.success(`Отправлено на печать: ${documents.length} QR кодов`);
  }

  private generatePrintContent(documents: Document[]): string {
    const qrCodes = documents.map(doc => `
      <div class="qr-item">
        <div class="qr-code">
          <img src="data:image/png;base64,${doc.qrCodeBase64}" alt="QR Code" />
        </div>
        <div class="qr-info">
          <div class="filename">${doc.filename}</div>
          <div class="url">${doc.accessLink}</div>
          <div class="date">Создан: ${this.formatDate(doc.createdAt)}</div>
        </div>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR коды документов</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
          }
          .qr-item {
            display: flex;
            align-items: center;
            margin-bottom: 30px;
            page-break-inside: avoid;
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 8px;
          }
          .qr-code {
            margin-right: 20px;
            flex-shrink: 0;
          }
          .qr-code img {
            width: 150px;
            height: 150px;
          }
          .qr-info {
            flex: 1;
          }
          .filename {
            font-weight: bold;
            font-size: 18px;
            margin-bottom: 10px;
            color: #333;
          }
          .url {
            font-size: 12px;
            color: #666;
            word-break: break-all;
            margin-bottom: 5px;
          }
          .date {
            font-size: 12px;
            color: #999;
          }
          @media print {
            body { margin: 0; }
            .qr-item { 
              margin-bottom: 20px;
              border: 1px solid #000;
            }
          }
        </style>
      </head>
      <body>
        <h1>QR коды документов (${documents.length})</h1>
        ${qrCodes}
      </body>
      </html>
    `;
  }
}