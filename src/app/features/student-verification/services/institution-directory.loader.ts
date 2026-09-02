import { InjectionToken } from '@angular/core';
import { Institution } from '../models/student-verification.model';

/** Shape of the generated directory module. */
export interface InstitutionDirectoryModule {
  readonly GENERATED_INSTITUTIONS: readonly Institution[];
}

export type InstitutionDirectoryLoader = () => Promise<InstitutionDirectoryModule>;

/**
 * Indirection for the lazily loaded generated dataset.
 *
 * The dataset is a large generated module, so it must stay behind a dynamic
 * import and out of the initial bundle. Specs cannot reach for `vi.mock()` here:
 * the Angular unit-test system rejects module mocking of relative imports
 * ("Please use Angular TestBed for mocking dependencies"). Injecting the loader
 * keeps the code-splitting and makes both the success and failure paths
 * testable by providing a stub.
 */
export const INSTITUTION_DIRECTORY_LOADER = new InjectionToken<InstitutionDirectoryLoader>(
  'INSTITUTION_DIRECTORY_LOADER',
  {
    providedIn: 'root',
    factory: () => () => import('./institutions.data'),
  },
);
