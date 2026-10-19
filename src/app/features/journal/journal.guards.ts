import type { CanDeactivateFn } from '@angular/router';
import type { JournalComponent } from './pages/journal/journal.component';

/**
 * Blocks leaving the journal page while the writer has unsaved work that autosave
 * could not keep. Wire with `canDeactivate: [journalCanDeactivate]` on the journal route.
 */
export const journalCanDeactivate: CanDeactivateFn<JournalComponent> = (component) => component.canLeave();
