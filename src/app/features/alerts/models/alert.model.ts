/**
 * ============================================================================
 *  ALERT DOMAIN MODEL
 * ============================================================================
 *  An "Alert" is an operational warning raised against an asset — e.g. a debris
 *  proximity warning or an asset entering maintenance. The alerts panel on the
 *  left of the dashboard renders these as colour-coded cards.
 *
 *  Data source: `mock-alerts.json` (Hours 1-4) or `GET /api/alerts` (Hour 5).
 * ============================================================================
 */

/** Severity drives the card's left-border colour and sort priority. */
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Alert {
  id: number;
  /** Name of the asset the alert refers to (denormalised for display). */
  asset_name: string;
  message: string;
  severity: AlertSeverity;
  /** Whether an operator has acknowledged (ACK'd) the alert. */
  acknowledged: boolean;
  /** ISO-8601 timestamp of when the alert was raised. */
  created_at: string;
}
