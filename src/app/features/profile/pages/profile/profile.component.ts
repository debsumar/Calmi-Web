import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './profile.component.html',
})
export class ProfileComponent {}
