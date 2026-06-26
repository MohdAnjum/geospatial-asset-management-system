/**
 * ============================================================================
 *  ADD-ASSET DIALOG  (FE-1.4)
 * ============================================================================
 *  A PrimeNG p-dialog wrapping a Reactive Form to create a new asset.
 *
 *  VALIDATION (mandated by the assignment)
 *    name      : required
 *    asset_type: required (dropdown)
 *    status    : required (dropdown)
 *    latitude  : required, between -90 and 90
 *    longitude : required, between -180 and 180
 *    altitude  : optional (defaults to 0)
 *
 *  ON SAVE
 *    Build a NewAsset and hand it to AssetService.addAsset(). The service
 *    pushes it into the shared store and emits `added$`, so the marker appears
 *    on the map instantly and the table row appears — no API call in mock mode.
 *
 *  The dialog's open state is a two-way `visible` model so the parent can open
 *  it with `[(visible)]`.
 * ============================================================================
 */
import { Component, inject, model, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';

import { AssetService, NewAsset } from '../../services/asset.service';
import { Asset } from '../../models/asset.model';
import {
  ASSET_TYPE_OPTIONS,
  STATUS_OPTIONS,
  statusColor,
} from '../../../../core/constants/asset.constants';

@Component({
  selector: 'app-asset-form-dialog',
  imports: [
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
  ],
  templateUrl: './asset-form-dialog.html',
  styleUrl: './asset-form-dialog.scss',
})
export class AssetFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly assetService = inject(AssetService);
  private readonly toast = inject(MessageService);

  /** Two-way open/close flag: <app-asset-form-dialog [(visible)]="..."/>. */
  readonly visible = model(false);
  /** Emits the created asset so the parent can react (e.g. pan the map). */
  readonly saved = output<Asset>();

  readonly typeOptions = ASSET_TYPE_OPTIONS;
  readonly statusOptions = STATUS_OPTIONS;

  /** Reactive form with the validation rules above. */
  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    asset_type: ['Satellite', [Validators.required]],
    status: ['active', [Validators.required]],
    latitude: [null as number | null, [Validators.required, Validators.min(-90), Validators.max(90)]],
    longitude: [null as number | null, [Validators.required, Validators.min(-180), Validators.max(180)]],
    altitude_km: [0 as number | null],
  });

  /** Save handler — validate, build the asset, push it, notify, close. */
  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const payload: NewAsset = {
      name: v.name.trim(),
      asset_type: v.asset_type,
      status: v.status as Asset['status'],
      latitude: v.latitude!,
      longitude: v.longitude!,
      altitude_km: v.altitude_km ?? 0,
      speed_kmph: 0,
      // New assets inherit the status colour so map + table stay consistent.
      color: statusColor(v.status),
    };

    const created = this.assetService.addAsset(payload);

    this.toast.add({
      severity: 'success',
      summary: 'Asset added',
      detail: `${created.name} is now on the map.`,
      life: 3000,
    });

    this.saved.emit(created);
    this.close();
  }

  /** Close and reset so the next open starts clean. */
  close(): void {
    this.visible.set(false);
    this.form.reset({ asset_type: 'Satellite', status: 'active', altitude_km: 0 });
  }
}
