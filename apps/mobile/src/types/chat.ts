export type AuthorKind = 'user' | 'vault';

export interface ChatMessage {
  id: string;
  author: AuthorKind;
  body: string;
  createdAt: string;
  status?: 'streaming' | 'sent' | 'error';
  attachmentPreview?: string;
}
