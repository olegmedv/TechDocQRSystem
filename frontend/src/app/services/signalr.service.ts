import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environment';
import { NzMessageService } from 'ng-zorro-antd/message';

export interface DocumentProcessingNotification {
  documentId: string;
  filename: string;
  status: 'processing' | 'completed' | 'failed';
  summary?: string;
  tags?: string[];
  error?: string;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubConnection: signalR.HubConnection | null = null;
  private documentUpdatesSubject = new BehaviorSubject<DocumentProcessingNotification | null>(null);
  
  public documentUpdates$: Observable<DocumentProcessingNotification | null> = this.documentUpdatesSubject.asObservable();

  constructor(private message: NzMessageService) {}

  public startConnection(): void {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      console.log('🔌 SignalR: Connection already established');
      return;
    }

    const token = localStorage.getItem('authToken');
    console.log('🔍 SignalR: All localStorage items:', {
      authToken: localStorage.getItem('authToken')?.substring(0, 50) + '...',
      currentUser: localStorage.getItem('currentUser'),
      expiresAt: localStorage.getItem('expiresAt')
    });
    
    if (!token) {
      console.warn('⚠️ SignalR: No auth token found, cannot connect to SignalR hub');
      console.warn('⚠️ SignalR: Available localStorage keys:', Object.keys(localStorage));
      return;
    }

    console.log('🔌 SignalR: Starting connection with token:', token.substring(0, 50) + '...');
    
    const signalrUrl = `${environment.apiUrl}/documentHub?access_token=${token}`;
    console.log('🔗 SignalR: Connection URL:', signalrUrl);

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(signalrUrl, {
        withCredentials: true
      })
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.hubConnection
      .start()
      .then(() => {
        console.log('✅ SignalR: Connection established successfully');
        console.log('🔌 SignalR: Connection state:', this.hubConnection?.state);
        this.joinUserGroup();
        this.registerEventHandlers();
      })
      .catch(err => {
        console.error('❌ SignalR: Error starting connection:', err);
        console.error('❌ SignalR: Error details:', {
          message: err.message,
          status: err.status,
          url: err.url,
          name: err.name
        });
        if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
          console.error('🔑 SignalR: Authentication failed - token might be invalid');
        }
        if (err.message?.includes('CORS') || err.message?.includes('cors')) {
          console.error('🌐 SignalR: CORS error - check server CORS configuration');
        }
      });

    this.hubConnection.onreconnected(() => {
      console.log('🔄 SignalR: Reconnected successfully');
      this.joinUserGroup();
    });

    this.hubConnection.onclose(() => {
      console.log('🔌 SignalR: Connection closed');
    });

    this.hubConnection.onreconnecting(() => {
      console.log('🔄 SignalR: Attempting to reconnect...');
    });
  }

  public stopConnection(): void {
    if (this.hubConnection) {
      console.log('🔌 SignalR: Stopping connection...');
      this.hubConnection.stop();
      this.hubConnection = null;
    }
  }

  public forceReconnect(): void {
    console.log('🔄 SignalR: Force reconnecting...');
    this.stopConnection();
    setTimeout(() => {
      this.startConnection();
    }, 1000);
  }

  private joinUserGroup(): void {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      console.log('🔗 SignalR: Joining user group...');
      this.hubConnection.invoke('JoinUserGroup')
        .then(() => {
          console.log('✅ SignalR: Successfully joined user group');
        })
        .catch(err => {
          console.error('❌ SignalR: Error joining user group:', err);
        });
    } else {
      console.warn('⚠️ SignalR: Cannot join user group - connection not established');
    }
  }

  private registerEventHandlers(): void {
    if (!this.hubConnection) {
      console.warn('⚠️ SignalR: Cannot register event handlers - no connection');
      return;
    }

    console.log('🎧 SignalR: Registering event handlers...');

    // Handle document processing started
    this.hubConnection.on('DocumentProcessingStarted', (data: DocumentProcessingNotification) => {
      console.log('🔔 SignalR: Received DocumentProcessingStarted:', data);
      this.message.info(`Началась обработка документа: ${data.filename}`);
      this.documentUpdatesSubject.next(data);
    });

    // Handle document processing completed
    this.hubConnection.on('DocumentProcessingCompleted', (data: DocumentProcessingNotification) => {
      console.log('🔔 SignalR: Received DocumentProcessingCompleted:', data);
      console.log('📄 Document data - Summary:', data.summary?.substring(0, 100), 'Tags:', data.tags);
      this.message.success(`Документ обработан: ${data.filename}`);
      this.documentUpdatesSubject.next(data);
    });

    // Handle document processing failed
    this.hubConnection.on('DocumentProcessingFailed', (data: DocumentProcessingNotification) => {
      console.log('🔔 SignalR: Received DocumentProcessingFailed:', data);
      this.message.error(`Ошибка обработки документа: ${data.filename}`);
      this.documentUpdatesSubject.next(data);
    });

    console.log('✅ SignalR: Event handlers registered successfully');
  }

  public getConnectionState(): signalR.HubConnectionState | null {
    return this.hubConnection?.state || null;
  }
}