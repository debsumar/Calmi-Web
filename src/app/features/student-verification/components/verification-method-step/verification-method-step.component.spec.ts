// @vitest-environment jsdom
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STUDENT_VERIFICATION_INSTITUTIONS } from '../../services/student-verification.fixtures';
import { StudentVerificationService } from '../../services/student-verification.service';
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

  it('renders an accessible institution combobox, radio fieldset, consent, and native file input', () => {
    const root = fixture.nativeElement as HTMLElement;
    const combobox = root.querySelector('#verification-institution') as HTMLInputElement;
    expect(combobox.getAttribute('role')).toBe('combobox');
    expect(combobox.getAttribute('aria-expanded')).toBe('false');
    expect(combobox.getAttribute('aria-controls')).toBe('verification-institution-options');
    expect(root.querySelectorAll('input[type="radio"]')).toHaveLength(2);
    expect(root.querySelector('fieldset legend')?.textContent).toContain('prove enrolment');
    expect(root.querySelector('input[type="file"]')).not.toBeNull();
    expect(root.querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBe(true);
  });

  it('starts the institution directory load once without blocking focus', () => {
    const service = TestBed.inject(StudentVerificationService);
    const load = vi.spyOn(service, 'loadInstitutionDirectory').mockResolvedValue(undefined);
    const combobox = fixture.nativeElement.querySelector('#verification-institution') as HTMLInputElement;

    combobox.focus();
    combobox.dispatchEvent(new Event('focus', { bubbles: true }));
    combobox.dispatchEvent(new Event('focus', { bubbles: true }));
    fixture.detectChanges();

    expect(load).toHaveBeenCalledTimes(1);
    expect(combobox.getAttribute('aria-expanded')).toBe('true');
    load.mockRestore();
  });

  it('filters institutions and exposes their allowed domain as secondary text', () => {
    const root = fixture.nativeElement as HTMLElement;
    const combobox = root.querySelector('#verification-institution') as HTMLInputElement;
    combobox.value = 'IIT Khar';
    combobox.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    expect(root.querySelector('[role="listbox"]')).not.toBeNull();
    const options = root.querySelectorAll('[role="option"]');
    expect(options).toHaveLength(1);
    expect(options[0].textContent).toContain('IIT Kharagpur');
    expect(options[0].querySelector('.institution-domain')?.textContent).toContain('iitkgp.ac.in');
    expect(options[0].querySelector('.institution-domain')?.textContent).not.toBe('');
  });

  it('labels domainless institutions as requiring student ID upload', () => {
    const domainless = { id: 'ror-only-university', name: 'ROR Only University', domains: [] as const };
    fixture.componentRef.setInput('institutions', [...STUDENT_VERIFICATION_INSTITUTIONS, domainless]);
    fixture.detectChanges();
    const combobox = fixture.nativeElement.querySelector('#verification-institution') as HTMLInputElement;
    combobox.value = 'ROR Only';
    combobox.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    const option = fixture.nativeElement.querySelector('[role="option"]') as HTMLElement;
    expect(option.querySelector('.institution-domain')?.textContent).toBe('Student ID upload required');
  });

  it('selects an institution with Home and Enter keyboard navigation', () => {
    const root = fixture.nativeElement as HTMLElement;
    const combobox = root.querySelector('#verification-institution') as HTMLInputElement;
    combobox.focus();
    combobox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    combobox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.form.controls.institutionName.value).toBe('IIT Bombay');
    expect(combobox.getAttribute('aria-expanded')).toBe('false');
  });

  it('wires active descendant and selected option state for keyboard users', () => {
    const root = fixture.nativeElement as HTMLElement;
    const combobox = root.querySelector('#verification-institution') as HTMLInputElement;
    combobox.focus();
    combobox.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();

    const activeId = combobox.getAttribute('aria-activedescendant');
    expect(combobox.getAttribute('aria-expanded')).toBe('true');
    expect(activeId).toBeTruthy();
    expect(root.querySelector(`#${activeId}`)?.getAttribute('role')).toBe('option');
    expect(root.querySelector(`#${activeId}`)?.getAttribute('aria-selected')).toBe('false');
    expect(root.querySelector('[role="option"][aria-selected="true"]')).toBeNull();
  });

  it('moves the active descendant to the end of a long filtered list', () => {
    const root = fixture.nativeElement as HTMLElement;
    const combobox = root.querySelector('#verification-institution') as HTMLInputElement;
    combobox.focus();
    combobox.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    fixture.detectChanges();

    const lastInstitution = STUDENT_VERIFICATION_INSTITUTIONS[STUDENT_VERIFICATION_INSTITUTIONS.length - 1];
    expect(combobox.getAttribute('aria-activedescendant')).toBe(`verification-institution-option-${lastInstitution.id}`);
  });

  it('closes on Escape and reports an empty filter state', () => {
    const root = fixture.nativeElement as HTMLElement;
    const combobox = root.querySelector('#verification-institution') as HTMLInputElement;
    combobox.value = 'No such institution';
    combobox.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(root.querySelector('.institution-empty')?.textContent).toContain('No institutions match');

    combobox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(combobox.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(combobox);
  });

  it('closes on an outside click and returns focus to the combobox', () => {
    const root = fixture.nativeElement as HTMLElement;
    const combobox = root.querySelector('#verification-institution') as HTMLInputElement;
    combobox.focus();
    fixture.detectChanges();

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(combobox.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(combobox);
  });

  it('hydrates the method form from a saved request', () => {
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

  it('disables email proof and announces document upload for a domainless institution', () => {
    const domainless = { id: 'ror-only-university', name: 'ROR Only University', domains: [] as const };
    fixture.componentRef.setInput('institutions', [...STUDENT_VERIFICATION_INSTITUTIONS, domainless]);
    fixture.detectChanges();

    fixture.componentInstance.selectInstitution(domainless);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const emailRadio = root.querySelector('input[value="email"]') as HTMLInputElement;
    const documentRadio = root.querySelector('input[value="document"]') as HTMLInputElement;
    const hint = root.querySelector('#verification-email-method-hint') as HTMLElement;
    expect(emailRadio.disabled).toBe(true);
    expect(documentRadio.disabled).toBe(false);
    expect(emailRadio.getAttribute('aria-describedby')).toBe('verification-email-method-hint');
    expect(hint.textContent).toContain('no published email domain');
    expect(hint.getAttribute('role')).toBe('status');
    expect(hint.getAttribute('aria-live')).toBe('polite');
  });

  it('keeps email proof available for a domain-bearing institution', () => {
    fixture.componentInstance.selectInstitution(STUDENT_VERIFICATION_INSTITUTIONS[0]);
    fixture.detectChanges();

    const emailRadio = fixture.nativeElement.querySelector('input[value="email"]') as HTMLInputElement;
    expect(emailRadio.disabled).toBe(false);
    expect(emailRadio.getAttribute('aria-describedby')).toBeNull();
    expect(fixture.nativeElement.querySelector('#verification-email-method-hint')).toBeNull();
  });

  it('explains why email proof is unavailable for a domainless institution', () => {
    const domainless = { id: 'ror-only-university', name: 'ROR Only University', domains: [] as const };
    fixture.componentRef.setInput('institutions', [...STUDENT_VERIFICATION_INSTITUTIONS, domainless]);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.form.controls.institutionName.setValue('ROR Only University');
    component.form.controls.institutionalEmail.setValue('student@ror-only.example');
    component.form.controls.consentAccepted.setValue(true);
    component.submitForm();
    fixture.detectChanges();

    expect(component.form.invalid).toBe(true);
    expect(fixture.nativeElement.querySelector('#verification-email-error')?.textContent)
      .toContain('This institution has no published email domain');
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
