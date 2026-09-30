import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-specialist-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './specialist-profile.component.html',
})
export class SpecialistProfileComponent {}
