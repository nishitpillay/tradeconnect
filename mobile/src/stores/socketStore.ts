import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

const SOCKET_EVENTS = {
  authRefresh: 'auth.refresh',
  joinConversation: 'conversation.join',
  leaveConversation: 'conversation.leave',
} as const;

const LEGACY_SOCKET_EVENTS = {
  authRefresh: 'auth:refresh',
} as const;

export interface MessageCreatedPayload {
  conversationId: string;
  messageId: string;
  messageType: string;
  createdAt: string;
}

export interface MessageDeletedPayload {
  messageId: string;
  conversationId?: string;
  deletedAt?: string;
}

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  isReconnecting: boolean;
  accessToken: string | null;
  connect: (accessToken: string) => void;
  updateAccessToken: (accessToken: string) => void;
  disconnect: () => void;
  emit: (event: string, data?: unknown) => void;
  on: <T = unknown>(event: string, callback: (data: T) => void) => () => void;
  off: <T = unknown>(event: string, callback: (data: T) => void) => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
}

const SOCKET_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace('/api', '') || 'http://localhost:3000';

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  isReconnecting: false,
  accessToken: null,

  connect: (accessToken) => {
    set({ accessToken });
    const existing = get().socket;
    if (existing?.connected) return;
    if (existing) existing.disconnect();

    const socket = io(SOCKET_URL, {
      auth: (cb) => cb({ token: get().accessToken ?? accessToken }),
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      set({ isConnected: true, isReconnecting: false });
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      set({ isConnected: false });
    });

    socket.on('reconnect_attempt', () => {
      set({ isReconnecting: true });
    });

    socket.on('reconnect', () => {
      console.log('[Socket] Reconnected');
      set({ isConnected: true, isReconnecting: false });
    });

    socket.on('connect_error', (error) => {
      console.warn('[Socket] Connection error:', error.message);
    });

    set({ socket });
  },

  updateAccessToken: (accessToken) => {
    const { socket } = get();
    set({ accessToken });
    if (!socket) return;
    socket.auth = { token: accessToken };
    if (socket.connected) {
      socket.emit(SOCKET_EVENTS.authRefresh, accessToken);
      socket.emit(LEGACY_SOCKET_EVENTS.authRefresh, accessToken);
    }
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false, isReconnecting: false });
    }
  },

  emit: (event, data) => {
    const { socket, isConnected } = get();
    if (socket && isConnected) {
      socket.emit(event, data);
      return;
    }
    console.warn('[Socket] Cannot emit - not connected:', event);
  },

  on: (event, callback) => {
    const { socket } = get();
    if (!socket) {
      console.warn('[Socket] Cannot subscribe - socket not initialised:', event);
      return () => {};
    }
    socket.on(event, callback as (...args: unknown[]) => void);
    return () => {
      socket.off(event, callback as (...args: unknown[]) => void);
    };
  },

  off: (event, callback) => {
    const { socket } = get();
    if (socket) {
      socket.off(event, callback as (...args: unknown[]) => void);
    }
  },

  joinConversation: (conversationId) => {
    get().emit(SOCKET_EVENTS.joinConversation, { conversationId });
  },

  leaveConversation: (conversationId) => {
    get().emit(SOCKET_EVENTS.leaveConversation, { conversationId });
  },
}));

