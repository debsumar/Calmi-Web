import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase: SupabaseClient;
  
  // Track the current logged-in user
  currentUser = signal<User | null>(null);
  showLoginDialog = signal(false);

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

    // Get current session/user if it exists
    this.supabase.auth.getSession().then(({ data }) => {
      this.currentUser.set(data.session?.user ?? null);
    });

    // Listen to changes in auth state (login/logout/token updates)
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.currentUser.set(session?.user ?? null);
    });
  }

  // Trigger Google sign-in flow
  async signInWithGoogle(): Promise<void> {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) {
      console.error('Google Sign-in error:', error.message);
      throw error;
    }
  }

  // Sign out user
  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      console.error('Sign-out error:', error.message);
      throw error;
    }
    this.currentUser.set(null);
  }

  openLogin(): void {
    this.showLoginDialog.set(true);
  }

  closeLogin(): void {
    this.showLoginDialog.set(false);
  }
}
