/**
 * ============================================================================
 *  ASSET-RELATED CONSTANTS (single source of truth for colours & options)
 * ============================================================================
 *  Keeping these here means the map markers, the table colour dot, the status
 *  filter dropdown, and the add-asset form all agree on the same values. Change
 *  a colour once and it updates everywhere.
 * ============================================================================
 */

import { AssetStatus, AssetType } from '../../features/assets/models/asset.model';
import { AlertSeverity } from '../../features/alerts/models/alert.model';

/**
 * Status → marker colour. These are the high-contrast colours mandated for the
 * OpenLayers markers (FE-1.2) and reused for the table's colour dot so the two
 * views stay visually consistent.
 */
export const STATUS_COLORS: Record<AssetStatus, string> = {
  active: '#00ff88',
  critical: '#ff4757',
  maintenance: '#ffa502',
  inactive: '#64748b',
};

/** Fallback colour for any unexpected/unknown status value. */
export const DEFAULT_STATUS_COLOR = '#64748b';

/** Resolve a status to its colour, defaulting gracefully. */
export function statusColor(status: string): string {
  return STATUS_COLORS[status as AssetStatus] ?? DEFAULT_STATUS_COLOR;
}

/** Alert severity → left-border colour for the alert cards (FE-1.4). */
export const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  critical: '#ff4757',
  high: '#ffa502',
  medium: '#1e90ff',
  low: '#64748b',
};

/** Severity ranking used to sort the alerts panel (critical first). */
export const SEVERITY_RANK: Record<AlertSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/** Options for the asset-type dropdown in the add-asset form. */
export const ASSET_TYPE_OPTIONS: { label: string; value: AssetType }[] = [
  { label: 'Satellite', value: 'Satellite' },
  { label: 'Ground Station', value: 'Ground Station' },
  { label: 'Radar', value: 'Radar' },
  { label: 'Space Debris', value: 'Space Debris' },
  { label: 'Observation Post', value: 'Observation Post' },
];

/** Options for the status dropdown (form + table filter). */
export const STATUS_OPTIONS: { label: string; value: AssetStatus }[] = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Critical', value: 'critical' },
];
