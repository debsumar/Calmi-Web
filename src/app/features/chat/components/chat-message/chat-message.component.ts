import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LucideDynamicIcon } from '@lucide/angular';
import { resolveHttpsAvatarUrl } from '@/core/identity/avatar-url';
import { AuthService } from '@/core/services/auth.service';
import { ChatMessage } from '../../models/chat-message.model';
import { ChatStoreService } from '../../services/chat-store.service';
import { ChatMarkdownComponent } from '../chat-markdown/chat-markdown.component';

@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [DatePipe, LucideDynamicIcon, ChatMarkdownComponent],
  templateUrl: './chat-message.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatMessageComponent {
  readonly message = input.required<ChatMessage>();
  readonly animate = input(false);
  readonly entranceIndex = input(0);
  private readonly store = inject(ChatStoreService);
  private readonly auth = inject(AuthService);
  private readonly avatarFailed = signal(false);

  /** Signed-in photo for own messages; falls back to the generic user icon when absent or broken. */
  readonly avatarUrl = computed(() => {
    if (this.avatarFailed()) return null;
    const metadata = this.auth.currentUser()?.user_metadata as Record<string, unknown> | undefined;
    return resolveHttpsAvatarUrl(metadata);
  });

  onAvatarError(): void {
    this.avatarFailed.set(true);
  }

  retry(): void {
    this.store.retry(this.message().id);
  }
}
