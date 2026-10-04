import { create } from 'zustand';
import { apiClient } from '../api/client';

interface ChatState {
  unread: number;
  // Bumped whenever the server says an inbox changed, so open lists refetch.
  inboxVersion: number;
  refreshUnread: () => Promise<void>;
  bumpInbox: () => void;
  clear: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  unread: 0,
  inboxVersion: 0,
  refreshUnread: async () => {
    const { data } = await apiClient.get<{ unread: number }>('/chat/unread');
    set({ unread: data.unread });
  },
  bumpInbox: () => set((s) => ({ inboxVersion: s.inboxVersion + 1 })),
  clear: () => set({ unread: 0 }),
}));
