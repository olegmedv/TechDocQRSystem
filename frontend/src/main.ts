import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { importProvidersFrom } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, provideHttpClient, withInterceptors } from '@angular/common/http';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/interceptors/auth.interceptor';

// Import ng-zorro modules
import { NZ_I18N, ru_RU } from 'ng-zorro-antd/i18n';
import { NZ_ICONS } from 'ng-zorro-antd/icon';
import { registerLocaleData } from '@angular/common';
import ru from '@angular/common/locales/ru';

// Import icons
import {
  HomeOutline,
  UploadOutline, 
  SearchOutline,
  DownloadOutline,
  FileTextOutline,
  MenuFoldOutline,
  MenuUnfoldOutline,
  UserOutline,
  DownOutline,
  SettingOutline,
  LogoutOutline,
  InboxOutline,
  QrcodeOutline
} from '@ant-design/icons-angular/icons';

const icons = [
  HomeOutline,
  UploadOutline,
  SearchOutline, 
  DownloadOutline,
  FileTextOutline,
  MenuFoldOutline,
  MenuUnfoldOutline,
  UserOutline,
  DownOutline,
  SettingOutline,
  LogoutOutline,
  InboxOutline,
  QrcodeOutline
];

registerLocaleData(ru);

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    importProvidersFrom(
      BrowserAnimationsModule,
      FormsModule,
      ReactiveFormsModule,
      HttpClientModule
    ),
    { provide: NZ_I18N, useValue: ru_RU },
    { provide: NZ_ICONS, useValue: icons }
  ]
}).catch(err => console.error(err));