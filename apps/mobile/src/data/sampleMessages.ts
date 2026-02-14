import { ChatMessage } from '@mobile/types/chat';

export const sampleMessages: ChatMessage[] = [
  {
    id: '1',
    author: 'vault',
    body: 'Morning, Christopher. Overnight I triaged two new leads and prepped the weekly investor snapshot.',
    createdAt: '2026-02-14T13:55:00.000Z',
    status: 'sent',
  },
  {
    id: '2',
    author: 'user',
    body: 'Nice. Give me the short version of the investor snapshot.',
    createdAt: '2026-02-14T13:55:12.000Z',
    status: 'sent',
  },
  {
    id: '3',
    author: 'vault',
    body: 'Highlights: burn runway 18.2 months, LTV/CAC 4.3x, shipping Argon2id migration Tuesday. Want me to schedule a walk-through?',
    createdAt: '2026-02-14T13:55:15.000Z',
    status: 'sent',
  },
  {
    id: '4',
    author: 'user',
    body: 'Yes, drop something on my calendar for 4pm.',
    createdAt: '2026-02-14T13:55:30.000Z',
    status: 'sent',
  },
];
