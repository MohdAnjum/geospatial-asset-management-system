/**
 * ============================================================================
 *  ALERTS PANEL  (FE-1.4, left column)
 * ============================================================================
 *  Loads alerts and renders each as a card with a severity-coloured left
 *  border. The header shows an "unread" (un-acknowledged) count badge.
 *
 *  ACK FLOW
 *   Clicking ACK calls AlertService.acknowledge(id). In mock mode that resolves
 *   instantly; on success we flip the alert's `acknowledged` flag locally,
 *   which both greys the card and decrements the unread badge (derived signal).
 *
 *  ORDERING: critical first (severity rank), then newest first.
 * ============================================================================
 */
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';

import { AlertService } from '../../services/alert.service';
import { Alert } from '../../models/alert.model';
import { SEVERITY_COLORS, SEVERITY_RANK } from '../../../../core/constants/asset.constants';

@Component({
  selector: 'app-alerts-panel',
  imports: [DatePipe],
  templateUrl: './alerts-panel.html',
  styleUrl: './alerts-panel.scss',
})
export class AlertsPanelComponent implements OnInit {
  private readonly alertService = inject(AlertService);
  private readonly destroyRef = inject(DestroyRef);

  /** All alerts, kept sorted (critical + newest first). */
  readonly alerts = signal<Alert[]>([]);
  /** Count of un-acknowledged alerts -> the header badge. */
  readonly unreadCount = computed(() => this.alerts().filter((a) => !a.acknowledged).length);

  readonly severityColor = (s: Alert['severity']): string => SEVERITY_COLORS[s];

  ngOnInit(): void {
    this.alertService
      .loadAlerts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((alerts) => this.alerts.set(this.sort(alerts)));
  }

  /** Acknowledge an alert, then mark it read locally on success. */
  acknowledge(alert: Alert): void {
    if (alert.acknowledged) return;
    this.alertService
      .acknowledge(alert.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        // Replace the alert with an acknowledged copy (immutable update so the
        // signal/computed badge recompute).
        this.alerts.update((list) =>
          list.map((a) => (a.id === alert.id ? { ...a, acknowledged: true } : a)),
        );
      });
  }

  /** Sort by severity rank, then by most recent. */
  private sort(alerts: Alert[]): Alert[] {
    return [...alerts].sort((a, b) => {
      const rank = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
      if (rank !== 0) return rank;
      return b.created_at.localeCompare(a.created_at);
    });
  }
}
