import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  ViewChild,
  effect,
  inject,
  input,
  output,
  signal,
  computed,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
  isValidDocument,
} from '../../services/student-verification.fixtures';
import {
  Institution,
  StudentVerificationRequest,
  VerificationMethod,
  VerificationMethodDraft,
} from '../../models/student-verification.model';
import { StudentVerificationService } from '../../services/student-verification.service';

interface VerificationForm {
  institutionName: FormControl<string>;
  method: FormControl<VerificationMethod>;
  institutionalEmail: FormControl<string>;
  document: FormControl<File | null>;
  consentAccepted: FormControl<boolean>;
}

@Component({
  selector: 'app-verification-method-step',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './verification-method-step.component.html',
  styleUrl: './verification-method-step.component.scss',
})
export class VerificationMethodStepComponent {
  readonly institutions = input.required<readonly Institution[]>();
  readonly request = input<StudentVerificationRequest | null>(null);
  readonly draft = input<VerificationMethodDraft | null>(null);
  readonly pending = input(false);
  readonly submitted = output<StudentVerificationRequest>();
  readonly draftChanged = output<VerificationMethodDraft>();
  readonly isDragover = signal(false);
  readonly submittedAttempt = signal(false);
  readonly selectedFile = signal<File | null>(null);
  readonly previewUrl = signal<string | null>(null);
  readonly isInstitutionOpen = signal(false);
  readonly institutionQuery = signal('');
  readonly activeInstitutionIndex = signal(-1);
  readonly institutionPlacement = signal({
    opensUpward: false,
    maxHeight: '16rem',
  });
  readonly filteredInstitutions = computed(() => {
    const query = this.institutionQuery().trim().toLowerCase();
    if (!query) return this.institutions();
    return this.institutions().filter((institution) =>
      `${institution.name} ${institution.domains.join(' ')}`.toLowerCase().includes(query),
    );
  });
  readonly activeInstitutionId = computed(() => {
    const index = this.activeInstitutionIndex();
    const institution = this.filteredInstitutions()[index];
    return institution ? `verification-institution-option-${institution.id}` : null;
  });
  private readonly destroyRef = inject(DestroyRef);
  private readonly hostElement = inject(ElementRef<HTMLElement>);
  readonly studentVerificationService = inject(StudentVerificationService);
  @ViewChild('institutionInput') private institutionInput?: ElementRef<HTMLInputElement>;
  private restoringInstitutionFocus = false;
  private institutionDirectoryLoadStarted = false;

  readonly form = new FormGroup<VerificationForm>({
    institutionName: new FormControl('', { nonNullable: true, validators: [Validators.required, this.institutionValidator()] }),
    method: new FormControl<VerificationMethod>('email', { nonNullable: true }),
    institutionalEmail: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email, this.emailDomainValidator()] }),
    document: new FormControl<File | null>(null),
    consentAccepted: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
  });

  private hydrating = false;

  constructor() {
    this.destroyRef.onDestroy(() => this.revokePreviewUrl());

    if (typeof document !== 'undefined') {
      // Scroll events do not bubble, so capture them to notice the dialog
      // scrolling under the open list, not just window scrolling.
      const onScrollCapture = () => {
        if (this.isInstitutionOpen()) this.updateInstitutionPopupPosition();
      };
      document.addEventListener('scroll', onScrollCapture, { capture: true, passive: true });
      this.destroyRef.onDestroy(() => {
        document.removeEventListener('scroll', onScrollCapture, { capture: true });
      });
    }

    effect(() => {
      const draft = this.draft();
      const request = this.request();
      if (draft && !this.matchesDraft(draft)) {
        this.applyDraft(draft);
      } else if (!draft && request) {
        this.form.patchValue({
          institutionName: request.institutionName,
          method: request.method,
          institutionalEmail: request.institutionalEmail ?? '',
          consentAccepted: request.consentAccepted,
        }, { emitEvent: false });
        this.institutionQuery.set(request.institutionName);
        this.syncProofValidators();
      }
    });

    effect(() => {
      this.institutions();
      this.form.controls.institutionName.updateValueAndValidity({ emitEvent: false });
      this.form.controls.institutionalEmail.updateValueAndValidity({ emitEvent: false });
    });

    this.form.controls.method.valueChanges.subscribe(() => {
      this.syncProofValidators();
      this.emitDraft();
    });
    this.form.controls.institutionName.valueChanges.subscribe((value) => {
      this.institutionQuery.set(value);
      this.form.controls.institutionalEmail.updateValueAndValidity({ emitEvent: false });
      this.emitDraft();
    });
    this.form.controls.institutionalEmail.valueChanges.subscribe(() => this.emitDraft());
    this.form.controls.consentAccepted.valueChanges.subscribe(() => this.emitDraft());
  }

  readonly emailFieldVisible = () => this.form.controls.method.value === 'email';

  showError(control: AbstractControl): boolean {
    return (control.touched || control.dirty || this.submittedAttempt()) && control.invalid;
  }

  institutionError(): string {
    const control = this.form.controls.institutionName;
    if (control.hasError('required')) return 'Select your college or university.';
    return 'Select an institution from the list.';
  }

  emailError(): string {
    const control = this.form.controls.institutionalEmail;
    if (control.hasError('required')) return 'Enter your institutional email address.';
    if (control.hasError('email')) return 'Enter a valid institutional email address.';
    if (!this.studentVerificationService.supportsEmailVerification(this.selectedInstitution())) {
      return 'This institution has no published email domain. Upload a student ID instead.';
    }
    return `Use an address issued by ${this.selectedInstitution()?.name ?? 'your selected institution'}.`;
  }

  fileError(): string {
    const file = this.selectedFile();
    if (!file) return 'Choose a student ID document.';
    if (!isValidDocument(file)) {
      if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.type as (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number])) return 'Use a JPEG, PNG, or PDF file.';
      if (file.size > MAX_DOCUMENT_SIZE_BYTES) return 'File must be no larger than 3 MB.';
    }
    return 'Choose a JPEG, PNG, or PDF file no larger than 3 MB.';
  }

  selectedInstitution(): Institution | null {
    const value = this.form.controls.institutionName.value.trim().toLowerCase();
    return this.institutions().find((institution) => institution.name.toLowerCase() === value) ?? null;
  }

  institutionSecondaryText(institution: Institution): string {
    return this.studentVerificationService.supportsEmailVerification(institution)
      ? institution.domains.join(', ')
      : 'Student ID upload required';
  }

  emailVerificationUnavailable(): boolean {
    const institution = this.selectedInstitution();
    return institution !== null && !this.studentVerificationService.supportsEmailVerification(institution);
  }

  emailMethodDescriptionId(): string | null {
    return this.emailVerificationUnavailable() ? 'verification-email-method-hint' : null;
  }

  emailMethodHint(): string | null {
    return this.emailVerificationUnavailable()
      ? 'This institution has no published email domain. Upload a student ID instead.'
      : null;
  }

  onInstitutionFocus(): void {
    if (!this.institutionDirectoryLoadStarted) {
      this.institutionDirectoryLoadStarted = true;
      void this.studentVerificationService.loadInstitutionDirectory().catch(() => undefined);
    }
    if (this.restoringInstitutionFocus) {
      this.restoringInstitutionFocus = false;
      return;
    }
    if (this.pending()) return;
    this.isInstitutionOpen.set(true);
    this.setActiveInstitution(-1);
    this.updateInstitutionPopupPosition(true);
  }

  onInstitutionInput(event: Event): void {
    if (this.pending()) return;
    const input = event.target as HTMLInputElement;
    this.institutionQuery.set(input.value);
    this.isInstitutionOpen.set(true);
    this.setActiveInstitution(-1);
    this.updateInstitutionPopupPosition(true);
  }

  onInstitutionKeydown(event: KeyboardEvent): void {
    const institutions = this.filteredInstitutions();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.isInstitutionOpen.set(true);
        this.moveActiveInstitution(1, institutions.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.isInstitutionOpen.set(true);
        this.moveActiveInstitution(-1, institutions.length);
        break;
      case 'Home':
        if (!institutions.length) return;
        event.preventDefault();
        this.isInstitutionOpen.set(true);
        this.setActiveInstitution(0);
        break;
      case 'End':
        if (!institutions.length) return;
        event.preventDefault();
        this.isInstitutionOpen.set(true);
        this.setActiveInstitution(institutions.length - 1);
        break;
      case 'Enter': {
        const active = institutions[this.activeInstitutionIndex()];
        if (!this.isInstitutionOpen() || !active) return;
        event.preventDefault();
        this.selectInstitution(active);
        break;
      }
      case 'Escape':
        if (!this.isInstitutionOpen()) return;
        event.preventDefault();
        this.closeInstitutionList(true);
        break;
    }
  }

  selectInstitution(institution: Institution): void {
    if (this.pending()) return;
    this.form.controls.institutionName.setValue(institution.name);
    this.form.controls.institutionName.markAsDirty();
    this.institutionQuery.set(institution.name);
    this.closeInstitutionList(true);
  }

  isActiveInstitution(institution: Institution): boolean {
    return this.filteredInstitutions()[this.activeInstitutionIndex()]?.id === institution.id;
  }

  isSelectedInstitution(institution: Institution): boolean {
    return this.selectedInstitution()?.id === institution.id;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.hostElement.nativeElement.contains(event.target as Node)) return;
    const target = event.target as Element | null;
    // Dialog navigation buttons can change panes immediately after this click.
    // Do not move focus back into a pane that is about to become inert.
    const isDialogAction = target instanceof Element
      && target.closest('.verification-dialog__nav-button, .verification-dialog__close') !== null;
    this.closeInstitutionList(!isDialogAction);
  }

  @HostListener('window:resize')
  onViewportChange(): void {
    if (this.isInstitutionOpen()) this.updateInstitutionPopupPosition();
  }

  onInstitutionFocusOut(): void {
    setTimeout(() => {
      if (!this.hostElement.nativeElement.contains(document.activeElement)) {
        this.closeInstitutionList(false);
      }
    });
  }

  private moveActiveInstitution(direction: 1 | -1, count: number): void {
    if (!count) {
      this.setActiveInstitution(-1);
      return;
    }
    const current = this.activeInstitutionIndex();
    const next = current < 0
      ? (direction > 0 ? 0 : count - 1)
      : (current + direction + count) % count;
    this.setActiveInstitution(next);
  }

  private setActiveInstitution(index: number): void {
    this.activeInstitutionIndex.set(index);
    if (index < 0) return;

    queueMicrotask(() => {
      if (!this.isInstitutionOpen()) return;
      const optionId = this.activeInstitutionId();
      if (!optionId) return;
      const option = (this.hostElement.nativeElement as HTMLElement).querySelector<HTMLElement>(`#${optionId}`);
      if (option && typeof option.scrollIntoView === 'function') option.scrollIntoView({ block: 'nearest' });
    });
  }

  private updateInstitutionPopupPosition(reveal = false): void {
    const input = this.institutionInput?.nativeElement;
    if (!input || typeof window === 'undefined') return;

    // The popup is absolutely positioned inside the combobox, so only the flip
    // direction and height are computed here. Space is measured against the
    // nearest scrollable ancestor (the dialog) because that element clips the
    // popup, and its own transform makes viewport coordinates meaningless.
    const rect = input.getBoundingClientRect();
    const bounds = this.clippingBounds(input);
    const edgePadding = 8;
    const gap = 6;
    const preferredHeight = 256;
    const minimumHeight = 96;
    const below = Math.max(0, bounds.bottom - rect.bottom - gap - edgePadding);
    const above = Math.max(0, rect.top - bounds.top - gap - edgePadding);
    const opensUpward = below < preferredHeight && above > below;
    const availableHeight = Math.max(
      minimumHeight,
      Math.min(preferredHeight, opensUpward ? above : below),
    );

    this.institutionPlacement.set({
      opensUpward,
      maxHeight: `${Math.round(availableHeight)}px`,
    });
    this.revealInstitutionPopup(reveal);
  }

  /** Visible top/bottom of the nearest scroll container, falling back to the viewport. */
  private clippingBounds(input: HTMLElement): { top: number; bottom: number } {
    let top = 0;
    let bottom = window.innerHeight;
    for (let node = input.parentElement; node; node = node.parentElement) {
      const overflowY = window.getComputedStyle(node).overflowY;
      if (overflowY !== 'auto' && overflowY !== 'scroll' && overflowY !== 'hidden') continue;
      const rect = node.getBoundingClientRect();
      top = Math.max(top, rect.top);
      bottom = Math.min(bottom, rect.bottom);
    }
    return { top, bottom: Math.max(bottom, top) };
  }

  /** Scroll the dialog just enough that the open list is not cut off. */
  private revealInstitutionPopup(reveal: boolean): void {
    if (!reveal) return;
    queueMicrotask(() => {
      if (!this.isInstitutionOpen()) return;
      const popup = (this.hostElement.nativeElement as HTMLElement)
        .querySelector<HTMLElement>('.institution-popup');
      if (popup && typeof popup.scrollIntoView === 'function') {
        popup.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  private closeInstitutionList(returnFocus: boolean): void {
    this.isInstitutionOpen.set(false);
    this.setActiveInstitution(-1);
    if (returnFocus && !this.pending()) {
      const input = this.institutionInput?.nativeElement;
      if (input) {
        this.restoringInstitutionFocus = true;
        input.focus();
        if (document.activeElement === input) this.restoringInstitutionFocus = false;
      }
    }
  }

  onMethodChange(): void {
    this.syncProofValidators();
    this.form.controls.institutionalEmail.updateValueAndValidity({ emitEvent: false });
    this.form.controls.document.updateValueAndValidity({ emitEvent: false });
    this.emitDraft();
  }

  onBlur(control: keyof VerificationForm): void {
    this.form.controls[control].markAsTouched();
    this.emitDraft();
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.setFile(input.files?.[0] ?? null);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragover.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragover.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragover.set(false);
    this.setFile(event.dataTransfer?.files?.[0] ?? null);
  }

  submitForm(): void {
    this.submittedAttempt.set(true);
    this.form.markAllAsTouched();
    this.syncProofValidators();
    this.emitDraft();
    if (this.form.invalid || this.pending()) return;

    const value = this.form.getRawValue();
    const institution = this.selectedInstitution();
    if (!institution) return;
    const request: StudentVerificationRequest = {
      institutionId: institution.id,
      institutionName: institution.name,
      method: value.method,
      consentAccepted: value.consentAccepted,
      ...(value.method === 'email'
        ? { institutionalEmail: value.institutionalEmail.trim() }
        : { documentName: value.document?.name }),
    };
    this.submitted.emit(request);
  }

  hasValidFile(): boolean {
    const file = this.selectedFile();
    return file !== null && isValidDocument(file);
  }

  isImageFile(file: File): boolean {
    return file.type.toLowerCase() === 'image/jpeg' || file.type.toLowerCase() === 'image/png';
  }

  fileTypeLabel(file: File): string {
    switch (file.type.toLowerCase()) {
      case 'image/jpeg': return 'JPEG image';
      case 'image/png': return 'PNG image';
      default: return 'PDF document';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB'];
    const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)) - 1, units.length - 1);
    return `${Number((bytes / 1024 ** (unit + 1)).toFixed(1))} ${units[unit]}`;
  }

  openFilePicker(input: HTMLInputElement): void {
    input.value = '';
    input.click();
  }

  removeFile(input: HTMLInputElement): void {
    input.value = '';
    this.setFile(null);
  }

  private setFile(file: File | null): void {
    this.revokePreviewUrl();
    this.selectedFile.set(file);
    if (file && isValidDocument(file) && this.isImageFile(file)) {
      this.previewUrl.set(URL.createObjectURL(file));
    }
    this.form.controls.document.setValue(file);
    this.form.controls.document.markAsTouched();
    this.form.controls.document.updateValueAndValidity();
    this.emitDraft();
  }

  private applyDraft(draft: VerificationMethodDraft): void {
    this.hydrating = true;
    this.revokePreviewUrl();
    this.form.patchValue({
      institutionName: draft.institutionName,
      method: draft.method,
      institutionalEmail: draft.institutionalEmail,
      document: draft.document,
      consentAccepted: draft.consentAccepted,
    }, { emitEvent: false });
    this.institutionQuery.set(draft.institutionName);
    this.selectedFile.set(draft.document);
    if (draft.document && isValidDocument(draft.document) && this.isImageFile(draft.document)) {
      this.previewUrl.set(URL.createObjectURL(draft.document));
    }
    const controls = this.form.controls;
    (Object.keys(draft.touched) as (keyof VerificationForm)[]).forEach((key) => {
      draft.touched[key] ? controls[key].markAsTouched() : controls[key].markAsUntouched();
      draft.dirty[key] ? controls[key].markAsDirty() : controls[key].markAsPristine();
    });
    this.submittedAttempt.set(draft.submittedAttempt);
    this.syncProofValidators();
    this.hydrating = false;
  }

  private matchesDraft(draft: VerificationMethodDraft): boolean {
    const value = this.form.getRawValue();
    const controls = this.form.controls;
    return value.institutionName === draft.institutionName
      && value.method === draft.method
      && value.institutionalEmail === draft.institutionalEmail
      && value.document === draft.document
      && value.consentAccepted === draft.consentAccepted
      && this.selectedFile() === draft.document
      && this.submittedAttempt() === draft.submittedAttempt
      && (Object.keys(draft.touched) as (keyof VerificationForm)[]).every((key) => controls[key].touched === draft.touched[key])
      && (Object.keys(draft.dirty) as (keyof VerificationForm)[]).every((key) => controls[key].dirty === draft.dirty[key]);
  }

  private emitDraft(): void {
    if (this.hydrating) return;
    const controls = this.form.controls;
    this.draftChanged.emit({
      institutionName: controls.institutionName.value,
      method: controls.method.value,
      institutionalEmail: controls.institutionalEmail.value,
      document: this.selectedFile(),
      consentAccepted: controls.consentAccepted.value,
      submittedAttempt: this.submittedAttempt(),
      touched: {
        institutionName: controls.institutionName.touched,
        method: controls.method.touched,
        institutionalEmail: controls.institutionalEmail.touched,
        document: controls.document.touched,
        consentAccepted: controls.consentAccepted.touched,
      },
      dirty: {
        institutionName: controls.institutionName.dirty,
        method: controls.method.dirty,
        institutionalEmail: controls.institutionalEmail.dirty,
        document: controls.document.dirty,
        consentAccepted: controls.consentAccepted.dirty,
      },
    });
  }

  private revokePreviewUrl(): void {
    const url = this.previewUrl();
    if (!url) return;
    URL.revokeObjectURL(url);
    this.previewUrl.set(null);
  }

  private syncProofValidators(): void {
    if (this.form.controls.method.value === 'email') {
      this.form.controls.institutionalEmail.setValidators([Validators.required, Validators.email, this.emailDomainValidator()]);
      this.form.controls.document.clearValidators();
    } else {
      this.form.controls.institutionalEmail.clearValidators();
      this.form.controls.document.setValidators([this.documentValidator()]);
    }
    this.form.controls.institutionalEmail.updateValueAndValidity({ emitEvent: false });
    this.form.controls.document.updateValueAndValidity({ emitEvent: false });
  }

  private institutionValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const normalized = String(control.value).trim().toLowerCase();
      return this.institutions().some((institution) => institution.name.toLowerCase() === normalized)
        ? null
        : { institution: true };
    };
  }

  private emailDomainValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const institution = this.selectedInstitution();
      const email = String(control.value).trim();
      return this.studentVerificationService.supportsEmailVerification(institution)
        && this.studentVerificationService.isAllowedDomain(email, institution)
        ? null
        : { institutionDomain: true };
    };
  }

  private documentValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const file = control.value as File | null;
      return file && isValidDocument(file) ? null : { document: true };
    };
  }
}
