/**
 * ============================================================================
 *  ROOT APPLICATION CONFIG
 * ============================================================================
 *  Standalone Angular has no AppModule — every app-wide provider is registered
 *  here and passed to bootstrapApplication() in main.ts.
 *
 *  What we wire up:
 *   - Router            : the route table in app.routes.ts
 *   - HttpClient        : with the JWT auth interceptor in the request chain
 *   - Animations        : required by PrimeNG overlays (dialog, toast, dropdown)
 *   - PrimeNG           : styled mode using the Aura theme preset
 *   - MessageService    : the singleton used by every <p-toast> in the app
 * ============================================================================
 */
import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import Aura from '@primeuix/themes/aura';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),

    // Routing
    provideRouter(routes),

    // HttpClient + functional JWT interceptor (attaches Authorization header)
    provideHttpClient(withInterceptors([authInterceptor])),

    // Animations power PrimeNG's overlay transitions
    provideAnimations(),

    // PrimeNG styled mode. `.dark` selector toggles the bundled dark palette;
    // this app is dark-themed, so we force dark via a class on <html> (styles.scss).
    providePrimeNG({
      theme: {
        preset: Aura,
        options: { darkModeSelector: '.app-dark' },
      },
    }),

    // App-wide toast bus — inject MessageService anywhere to raise toasts.
    MessageService,
  ],
};
