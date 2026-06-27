import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AvailabilityApi } from './availability-api';
import {
  AvailabilityBlock,
  AvailabilityRule,
  CreateBlockInput,
  CreateRuleInput,
} from './availability.models';
import {
  ConfirmationModal,
  DataTable,
  DataTableColumn,
  ToastService,
} from '@by-iara/shared-ui';

@Component({
  selector: 'byiara-availability',
  imports: [ReactiveFormsModule, DataTable, ConfirmationModal],
  templateUrl: './availability.html',
  styleUrl: './availability.css',
})
export class Availability implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AvailabilityApi);
  private readonly toast = inject(ToastService);

  // Navigation State
  protected readonly activeTab = signal<'rules' | 'blocks'>('rules');

  // Loading & Error states
  protected readonly loadingRules = signal(true);
  protected readonly loadingBlocks = signal(true);
  protected readonly ruleError = signal<string | null>(null);
  protected readonly blockError = signal<string | null>(null);
  protected readonly submittingRule = signal(false);
  protected readonly submittingBlock = signal(false);

  // Data signals
  protected readonly rules = signal<AvailabilityRule[]>([]);
  protected readonly blocks = signal<AvailabilityBlock[]>([]);

  // Deletion tracking signals
  protected readonly ruleToDelete = signal<AvailabilityRule | null>(null);
  protected readonly blockToDelete = signal<AvailabilityBlock | null>(null);

  // Forms
  protected readonly ruleForm = this.fb.nonNullable.group({
    dayOfWeek: ['', Validators.required],
    startTime: ['', Validators.required],
    endTime: ['', Validators.required],
  });

  protected readonly blockForm = this.fb.nonNullable.group({
    startTime: ['', Validators.required],
    endTime: ['', Validators.required],
    reason: [''],
  });

  // Constants
  protected readonly weekdays = [
    { label: 'Monday', value: 'MONDAY' },
    { label: 'Tuesday', value: 'TUESDAY' },
    { label: 'Wednesday', value: 'WEDNESDAY' },
    { label: 'Thursday', value: 'THURSDAY' },
    { label: 'Friday', value: 'FRIDAY' },
    { label: 'Saturday', value: 'SATURDAY' },
    { label: 'Sunday', value: 'SUNDAY' },
  ];

  protected readonly blockTableColumns: ReadonlyArray<DataTableColumn> = [
    { key: 'startTime', label: 'Start Date & Time' },
    { key: 'endTime', label: 'End Date & Time' },
    { key: 'reason', label: 'Reason / Description' },
    { key: 'actions', label: 'Actions', fit: true },
  ];

  // Modal template references
  @ViewChild('confirmDeleteRuleModal')
  private confirmDeleteRuleModal!: ConfirmationModal;

  @ViewChild('confirmDeleteBlockModal')
  private confirmDeleteBlockModal!: ConfirmationModal;

  ngOnInit(): void {
    this.reloadRules();
    this.reloadBlocks();
  }

  protected setActiveTab(tab: 'rules' | 'blocks'): void {
    this.activeTab.set(tab);
  }

  // --- Rules logic ---

  protected reloadRules(): void {
    this.loadingRules.set(true);
    this.ruleError.set(null);
    this.api.listRules().subscribe({
      next: (data) => {
        this.rules.set(data);
        this.loadingRules.set(false);
      },
      error: () => {
        this.ruleError.set('Could not load weekly working hours.');
        this.loadingRules.set(false);
      },
    });
  }

  protected getRulesForDay(day: string): AvailabilityRule[] {
    return this.rules()
      .filter((r) => r.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  protected formatTime(timeStr: string): string {
    if (!timeStr) return '';
    // e.g. "09:00:00" -> "09:00"
    return timeStr.substring(0, 5);
  }

  protected submitRule(): void {
    if (this.submittingRule()) return;

    if (this.ruleForm.invalid) {
      this.ruleForm.markAllAsTouched();
      return;
    }

    this.submittingRule.set(true);
    this.ruleError.set(null);

    const raw = this.ruleForm.getRawValue();
    
    // Ensure HH:MM:SS format
    const start = raw.startTime.length === 5 ? `${raw.startTime}:00` : raw.startTime;
    const end = raw.endTime.length === 5 ? `${raw.endTime}:00` : raw.endTime;

    const input: CreateRuleInput = {
      dayOfWeek: raw.dayOfWeek,
      startTime: start,
      endTime: end,
    };

    this.api.createRule(input).subscribe({
      next: () => {
        this.toast.show('Weekly hours added successfully.', 'success');
        this.submittingRule.set(false);
        this.ruleForm.reset();
        this.reloadRules();
      },
      error: (err: HttpErrorResponse) => {
        this.submittingRule.set(false);
        const errMsg = err.error?.message || 'Could not save the weekly hours.';
        this.toast.show(errMsg, 'error');
        this.ruleError.set(errMsg);
      },
    });
  }

  protected confirmDeleteRule(rule: AvailabilityRule): void {
    this.ruleToDelete.set(rule);
    this.confirmDeleteRuleModal.open();
  }

  protected onConfirmDeleteRule(): void {
    const rule = this.ruleToDelete();
    if (!rule) return;

    this.api.deleteRule(rule.id).subscribe({
      next: () => {
        this.toast.show('Weekly hours removed successfully.', 'success');
        this.ruleToDelete.set(null);
        this.reloadRules();
      },
      error: () => {
        this.toast.show('Could not remove weekly hours.', 'error');
        this.ruleToDelete.set(null);
      },
    });
  }

  protected onCancelDeleteRule(): void {
    this.ruleToDelete.set(null);
  }

  // --- Blocks logic ---

  protected reloadBlocks(): void {
    this.loadingBlocks.set(true);
    this.blockError.set(null);
    
    // Fetch upcoming block-out periods starting from 1 month ago to show context
    const startFrom = new Date();
    startFrom.setMonth(startFrom.getMonth() - 1);

    this.api.listBlocks(startFrom.toISOString()).subscribe({
      next: (data) => {
        this.blocks.set(data);
        this.loadingBlocks.set(false);
      },
      error: () => {
        this.blockError.set('Could not load calendar overrides.');
        this.loadingBlocks.set(false);
      },
    });
  }

  protected formatDateTime(isoStr: string): string {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  }

  protected submitBlock(): void {
    if (this.submittingBlock()) return;

    if (this.blockForm.invalid) {
      this.blockForm.markAllAsTouched();
      return;
    }

    this.submittingBlock.set(true);
    this.blockError.set(null);

    const raw = this.blockForm.getRawValue();

    // Convert local datetime input (YYYY-MM-DDTHH:MM) to ISO string with timezone
    const startIso = new Date(raw.startTime).toISOString();
    const endIso = new Date(raw.endTime).toISOString();

    const input: CreateBlockInput = {
      startTime: startIso,
      endTime: endIso,
      reason: raw.reason || undefined,
    };

    this.api.createBlock(input).subscribe({
      next: () => {
        this.toast.show('Calendar block-out added successfully.', 'success');
        this.submittingBlock.set(false);
        this.blockForm.reset();
        this.reloadBlocks();
      },
      error: (err: HttpErrorResponse) => {
        this.submittingBlock.set(false);
        const errMsg = err.error?.message || 'Could not create calendar block.';
        this.toast.show(errMsg, 'error');
        this.blockError.set(errMsg);
      },
    });
  }

  protected confirmDeleteBlock(block: AvailabilityBlock): void {
    this.blockToDelete.set(block);
    this.confirmDeleteBlockModal.open();
  }

  protected onConfirmDeleteBlock(): void {
    const block = this.blockToDelete();
    if (!block) return;

    this.api.deleteBlock(block.id).subscribe({
      next: () => {
        this.toast.show('Blocked period removed successfully.', 'success');
        this.blockToDelete.set(null);
        this.reloadBlocks();
      },
      error: () => {
        this.toast.show('Could not remove blocked period.', 'error');
        this.blockToDelete.set(null);
      },
    });
  }

  protected onCancelDeleteBlock(): void {
    this.blockToDelete.set(null);
  }
}
