/**
 * ============================================================================
 *  ALERT SERVICE
 * ============================================================================
 *  Loads the alerts shown in the left panel and handles acknowledgement.
 *
 *   - mockMode true  : alerts come from mock-alerts.json; ACK is in-memory only
 *                      (resolved immediately so the UI can update the badge).
 *   - mockMode false : alerts come from GET /api/alerts; ACK calls
 *                      PATCH /api/alerts/:id/ack.
 * ============================================================================
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Alert } from '../models/alert.model';

@Injectable({ providedIn: 'root' })
export class AlertService {
  private readonly http = inject(HttpClient);

  /** Fetch all alerts (mock JSON file or live endpoint). */
  loadAlerts(): Observable<Alert[]> {
    const url = environment.mockMode
      ? environment.mockAlertsUrl
      : `${environment.apiUrl}/alerts`;
    return this.http.get<Alert[]>(url);
  }

  /**
   * Acknowledge an alert. In mock mode there is nothing to persist, so we
   * resolve immediately and let the component flip the flag locally. In live
   * mode this PATCHes the backend.
   */
  acknowledge(id: number): Observable<unknown> {
    if (environment.mockMode) {
      return of({ success: true });
    }
    return this.http.patch(`${environment.apiUrl}/alerts/${id}/ack`, {});
  }
}
