import { TestBed } from '@angular/core/testing';
import { appConfig } from './app.config';
import { PrimaryButtonComponent } from './shared/components/primary-button/primary-button.component';

describe('appConfig Lucide configuration', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrimaryButtonComponent],
      providers: appConfig.providers,
    }).compileComponents();
  });

  it('loads appConfig and renders a migrated Lucide icon registration', async () => {
    const fixture = TestBed.createComponent(PrimaryButtonComponent);
    fixture.componentRef.setInput('label', 'Calm Me Now');
    fixture.componentRef.setInput('icon', 'arrow-right');

    await fixture.whenStable();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    const icon = button.querySelector('svg[lucideIcon]') as SVGElement;

    expect(button.textContent).toContain('Calm Me Now');
    expect(icon).not.toBeNull();
    expect(icon.querySelector('path')).not.toBeNull();
  });
});
