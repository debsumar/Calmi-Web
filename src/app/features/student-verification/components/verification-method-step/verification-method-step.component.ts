import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
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
} from '../../models/student-verification.model';

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
  readonly pending = input(false);
  readonly submitted = output<StudentVerificationRequest>();
  readonly isDragover = signal(false);
  readonly submittedAttempt = signal(false);
  readonly selectedFile = signal<File | null>(null);
  readonly previewUrl = signal<string | null>(null);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = new FormGroup<VerificationForm>({
    institutionName: new FormControl('', { nonNullable: true, validators: [Validators.required, this.institutionValidator()] }),
    method: new FormControl<VerificationMethod>('email', { nonNullable: true }),
    institutionalEmail: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email, this.emailDomainValidator()] }),
    document: new FormControl<File | null>(null),
    consentAccepted: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.revokePreviewUrl());

    effect(() => {
      const request = this.request();
      if (!request) return;

      this.form.patchValue({
        institutionName: request.institutionName,
        method: request.method,
        institutionalEmail: request.institutionalEmail ?? '',
        consentAccepted: request.consentAccepted,
      }, { emitEvent: false });
      this.syncProofValidators();
    });

    this.form.controls.method.valueChanges.subscribe(() => this.syncProofValidators());
    this.form.controls.institutionName.valueChanges.subscribe(() => this.form.controls.institutionalEmail.updateValueAndValidity({ emitEvent: false }));
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
    const value = this.form.controls.institutionName.value.trim().toLocaleLowerCase();
    return this.institutions().find((institution) => institution.name.toLocaleLowerCase() === value) ?? null;
  }

  onMethodChange(): void {
    this.syncProofValidators();
    this.form.controls.institutionalEmail.updateValueAndValidity({ emitEvent: false });
    this.form.controls.document.updateValueAndValidity({ emitEvent: false });
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
      const normalized = String(control.value).trim().toLocaleLowerCase();
      return this.institutions().some((institution) => institution.name.toLocaleLowerCase() === normalized)
        ? null
        : { institution: true };
    };
  }

  private emailDomainValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const institution = this.selectedInstitution();
      const email = String(control.value).trim();
      const at = email.lastIndexOf('@');
      if (!institution || at < 1 || at === email.length - 1) return { institutionDomain: true };
      const domain = email.slice(at + 1).toLocaleLowerCase();
      return institution.domains.some((allowed) => domain === allowed.toLocaleLowerCase()) ? null : { institutionDomain: true };
    };
  }

  private documentValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const file = control.value as File | null;
      return file && isValidDocument(file) ? null : { document: true };
    };
  }
}
