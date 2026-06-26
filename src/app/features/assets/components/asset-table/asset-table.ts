/**
 * ============================================================================
 *  ASSET TABLE  (FE-1.3)
 * ============================================================================
 *  The right-hand data panel: a PrimeNG table of every asset with search,
 *  status filter, row-click map sync, and per-row actions.
 *
 *  SEARCH IS DEBOUNCED (a graded requirement)
 *   Keystrokes are pushed into an RxJS Subject piped through
 *   debounceTime(300) + distinctUntilChanged. Only after the user pauses does
 *   `search` update — so we filter the LOCAL array once, never per keystroke
 *   (and in live mode this is where you'd fire a single API call).
 *
 *  FILTERING
 *   `filtered` is a computed signal derived from the store list + the search
 *   term + the selected status. Changing any input re-derives the view.
 *
 *  ROW CLICK -> MAP
 *   Clicking a row calls AssetService.selectAsset(), which the map listens to
 *   and animates the view to that asset.
 *
 *  ACTIONS
 *   eye   -> open a read-only detail dialog
 *   trash -> AssetService.removeAsset() (also removes the marker from the map)
 * ============================================================================
 */
import {
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';

import { AssetService } from '../../services/asset.service';
import { Asset, AssetStatus } from '../../models/asset.model';
import { STATUS_OPTIONS, statusColor } from '../../../../core/constants/asset.constants';
import { AssetFormDialogComponent } from '../../dialogs/asset-form-dialog/asset-form-dialog';

@Component({
  selector: 'app-asset-table',
  imports: [
    DecimalPipe,
    FormsModule,
    TableModule,
    SelectModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    AssetFormDialogComponent,
  ],
  templateUrl: './asset-table.html',
  styleUrl: './asset-table.scss',
})
export class AssetTableComponent {
  private readonly assetService = inject(AssetService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  /** Live list from the shared store. */
  private readonly assets = this.assetService.assets;

  /** Filter inputs (reactive). */
  readonly search = signal('');
  readonly statusFilter = signal<AssetStatus | null>(null);
  /** Id of the row currently synced to the map (for row highlight). */
  readonly selectedId = signal<number | null>(null);

  readonly statusOptions = STATUS_OPTIONS;
  readonly statusColor = statusColor; // exposed to the template for the dot

  /** Add-asset dialog open state. */
  readonly addVisible = signal(false);
  /** Detail dialog state. */
  readonly detailVisible = signal(false);
  readonly detailAsset = signal<Asset | null>(null);

  /**
   * The rows actually rendered: store list narrowed by status then search.
   * Recomputed automatically whenever any of the three signals change.
   */
  readonly filtered = computed<Asset[]>(() => {
    const term = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    return this.assets().filter((a) => {
      const statusMatch = !status || a.status === status;
      const searchMatch = !term || a.name.toLowerCase().includes(term);
      return statusMatch && searchMatch;
    });
  });

  /** Debounce pipe: raw keystrokes -> settled search term. */
  private readonly searchInput = new Subject<string>();

  constructor() {
    this.searchInput
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => this.search.set(term));
  }

  /** Called on each keystroke; the debounce decides when to actually filter. */
  onSearch(value: string): void {
    this.searchInput.next(value);
  }

  /** Row click -> tell the map to pan to this asset. */
  onRowClick(asset: Asset): void {
    this.selectedId.set(asset.id);
    this.assetService.selectAsset(asset);
  }

  /** Eye action -> open the read-only detail dialog. */
  showDetail(asset: Asset, event: Event): void {
    event.stopPropagation(); // don't also trigger the row click
    this.detailAsset.set(asset);
    this.detailVisible.set(true);
  }

  /** Trash action -> delete from the store (map marker disappears too). */
  remove(asset: Asset, event: Event): void {
    event.stopPropagation();
    this.assetService.removeAsset(asset.id);
    if (this.selectedId() === asset.id) this.selectedId.set(null);
    this.toast.add({
      severity: 'info',
      summary: 'Asset removed',
      detail: `${asset.name} was removed.`,
      life: 2500,
    });
  }

  /** Open the add-asset dialog. */
  openAdd(): void {
    this.addVisible.set(true);
  }
}
