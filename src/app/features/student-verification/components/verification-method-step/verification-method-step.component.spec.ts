// @vitest-environment jsdom
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STUDENT_VERIFICATION_INSTITUTIONS } from '../../services/student-verification.fixtures';
import { VerificationMethodStepComponent } from './verification-method-step.component';

function mockObjectUrls() {
  const createObjectURL = vi.fn((file: File) => `blob:${file.name}`);
  const revokeObjectURL = vi.fn();
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, writable: true, value: createObjectURL });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: revokeObjectURL });
  return { createObjectURL, revokeObjectURL };
}

describe('VerificationMethodStepComponent', () => {
  let fixture: ComponentFixture<VerificationMethodStepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [VerificationMethodStepComponent] }).compileComponents();
    fixture = TestBed.createComponent(VerificationMethodStepComponent);
    fixture.componentRef.setInput('institutions', STUDENT_VERIFICATION_INSTITUTIONS);
    fixture.detectChanges();
  });

  it('renders institution combobox data, radio fieldset, consent, and native file input', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('input[list="verification-institutions"]')).not.toBeNull();
    expect(root.querySelectorAll('input[type="radio"]')).toHaveLength(2);
    expect(root.querySelector('fieldset legend')?.textContent).toContain('prove enrolment');
    expect(root.querySelector('input[type="file"]')).not.toBeNull();
    expect(root.querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBe(true);
  });

  it('rehydrates preserved request fields when returning to collection', () => {
    fixture.componentRef.setInput('request', {
      institutionId: 'iit-kharagpur',
      institutionName: 'IIT Kharagpur',
      method: 'document',
      documentName: 'student-id.pdf',
      consentAccepted: true,
    });
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.form.controls.institutionName.value).toBe('IIT Kharagpur');
    expect(component.form.controls.method.value).toBe('document');
    expect(component.form.controls.institutionalEmail.value).toBe('');
    expect(component.form.controls.consentAccepted.value).toBe(true);
    expect((fixture.nativeElement.querySelector('input[value="document"]') as HTMLInputElement).checked).toBe(true);
  });

  it('announces unknown institution and blocks submission', () => {
    const component = fixture.componentInstance;
    component.form.controls.institutionName.setValue('Unknown College');
    component.form.controls.institutionalEmail.setValue('student@unknown.example');
    component.form.controls.consentAccepted.setValue(true);
    component.submitForm();
    fixture.detectChanges();

    expect(component.form.invalid).toBe(true);
    expect(fixture.nativeElement.querySelector('#verification-institution-error')?.textContent).toContain('Select an institution');
    expect(fixture.nativeElement.querySelector('#verification-institution')?.getAttribute('aria-invalid')).toBe('true');
  });

  it('emits frozen request only for an allowed institutional domain', () => {
    const component = fixture.componentInstance;
    const emitted: unknown[] = [];
    component.submitted.subscribe((request) => emitted.push(request));
    component.form.setValue({
      institutionName: 'Jadavpur University',
      method: 'email',
      institutionalEmail: 'student@jadavpuruniversity.in',
      document: null,
      consentAccepted: true,
    });
    component.submitForm();

    expect(emitted).toEqual([{
      institutionId: 'jadavpur-university',
      institutionName: 'Jadavpur University',
      method: 'email',
      institutionalEmail: 'student@jadavpuruniversity.in',
      consentAccepted: true,
    }]);
  });

  it('rejects oversized document and reveals document proof field without disabling it', () => {
    const component = fixture.componentInstance;
    component.form.controls.method.setValue('document');
    component.onMethodChange();
    const oversized = new File(['x'], 'id.png', { type: 'image/png' });
    Object.defineProperty(oversized, 'size', { value: 6 * 1024 * 1024 });
    component.form.controls.document.setValue(oversized);
    component.selectedFile.set(oversized);
    component.form.controls.institutionName.setValue('Jadavpur University');
    component.form.controls.consentAccepted.setValue(true);
    component.submitForm();
    fixture.detectChanges();

    expect(component.form.invalid).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('no larger than 3 MB');
    expect(fixture.nativeElement.querySelector('#verification-document')?.hasAttribute('disabled')).toBe(false);
  });

  it('previews an image with file name, size, and type', () => {
    const { createObjectURL } = mockObjectUrls();
    const file = new File([new Uint8Array(1500)], 'student-id.jpg', { type: 'image/jpeg' });
    const input = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const image = fixture.nativeElement.querySelector('.preview-card img') as HTMLImageElement;
    expect(createObjectURL).toHaveBeenCalledWith(file);
    expect(image.src).toBe('blob:student-id.jpg');
    expect(image.alt).toBe('Preview of selected student ID');
    expect(fixture.nativeElement.querySelector('.file-name')?.textContent).toContain('student-id.jpg');
    expect(fixture.nativeElement.querySelector('.file-name')?.getAttribute('title')).toBe('student-id.jpg');
    expect(fixture.nativeElement.querySelector('.file-meta')?.textContent).toContain('1.5 KB');
    expect(fixture.nativeElement.querySelector('.file-meta')?.textContent).toContain('JPEG image');
  });

  it('shows a PDF placeholder without an image thumbnail', () => {
    const { createObjectURL } = mockObjectUrls();
    const file = new File(['pdf'], 'student-id.pdf', { type: 'application/pdf' });
    const input = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.preview-card img')).toBeNull();
    expect(fixture.nativeElement.querySelector('.document-icon')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.file-meta')?.textContent).toContain('PDF document');
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('rejects oversized and wrong-type files without a preview', () => {
    mockObjectUrls();
    const component = fixture.componentInstance;
    component.form.controls.method.setValue('document');
    component.onMethodChange();
    const input = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;
    const oversized = new File(['x'], 'too-large.png', { type: 'image/png' });
    Object.defineProperty(oversized, 'size', { value: 6 * 1024 * 1024 });
    Object.defineProperty(input, 'files', { configurable: true, value: [oversized] });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.preview-card')).toBeNull();
    expect(fixture.nativeElement.querySelector('#verification-file-error')?.textContent).toContain('no larger than 3 MB');

    const wrongType = new File(['x'], 'notes.txt', { type: 'text/plain' });
    Object.defineProperty(input, 'files', { configurable: true, value: [wrongType] });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.preview-card')).toBeNull();
    expect(fixture.nativeElement.querySelector('#verification-file-error')?.textContent).toContain('JPEG, PNG, or PDF');
  });

  it('Remove clears preview and resets file input value', () => {
    mockObjectUrls();
    const file = new File(['x'], 'student-id.png', { type: 'image/png' });
    const input = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    Object.defineProperty(input, 'value', { configurable: true, writable: true, value: 'C:\\fakepath\\student-id.png' });

    (fixture.nativeElement.querySelector('button:nth-of-type(2)') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.preview-card')).toBeNull();
    expect(input.value).toBe('');
    expect(fixture.componentInstance.selectedFile()).toBeNull();
  });

  it('revokes object URLs when selection changes and component is destroyed', () => {
    const { createObjectURL, revokeObjectURL } = mockObjectUrls();
    createObjectURL.mockReturnValueOnce('blob:first').mockReturnValueOnce('blob:second');
    const input = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;
    const first = new File(['1'], 'first.jpg', { type: 'image/jpeg' });
    const second = new File(['2'], 'second.jpg', { type: 'image/jpeg' });

    Object.defineProperty(input, 'files', { configurable: true, value: [first] });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    Object.defineProperty(input, 'files', { configurable: true, value: [second] });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:first');

    fixture.destroy();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:second');
  });

  it('keeps pristine validation errors hidden until touched or submitted', () => {
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelectorAll('.error')).toHaveLength(0);
    expect(root.querySelector('#verification-institution')?.getAttribute('aria-invalid')).toBeNull();
    expect(root.querySelector('#verification-email')?.getAttribute('aria-invalid')).toBeNull();
    expect(root.querySelector('#verification-document')?.getAttribute('aria-invalid')).toBeNull();
    expect(root.querySelector('input[type="checkbox"]')?.getAttribute('aria-invalid')).toBeNull();

    const institution = root.querySelector('#verification-institution') as HTMLInputElement;
    institution.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(root.querySelector('#verification-institution-error')?.textContent).toContain('Select your college or university.');
    expect(institution.getAttribute('aria-invalid')).toBe('true');

    const component = fixture.componentInstance;
    component.form.reset({
      institutionName: '',
      method: 'email',
      institutionalEmail: '',
      document: null,
      consentAccepted: false,
    });
    component.submittedAttempt.set(false);
    fixture.detectChanges();
    expect(root.querySelectorAll('.error')).toHaveLength(0);

    component.submitForm();
    fixture.detectChanges();
    expect(root.querySelector('#verification-institution-error')).not.toBeNull();
    expect(root.querySelector('#verification-email-error')).not.toBeNull();
    expect(root.querySelector('#verification-consent-error')).not.toBeNull();
    expect(root.querySelector('#verification-institution')?.getAttribute('aria-invalid')).toBe('true');
    expect(root.querySelector('#verification-email')?.getAttribute('aria-invalid')).toBe('true');
    expect(root.querySelector('input[type="checkbox"]')?.getAttribute('aria-invalid')).toBe('true');
  });
});
