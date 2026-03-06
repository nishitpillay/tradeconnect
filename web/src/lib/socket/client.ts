import { io, Socket } from 'socket.io-client';
import { webEnv } from '@/config/env';

const SOCKET_EVENTS = {
  authRefresh: 'auth.refresh',
  joinConversation: 'conversation.join',
  leaveConversation: 'conversation.leave',
  messageCreated: 'messaging.message.created',
  messageDeleted: 'messaging.message.deleted',
} as const;

const LEGACY_SOCKET_EVENTS = {
  authRefresh: 'auth:refresh',
  joinConversation: 'join_conversation',
  leaveConversation: 'leave_conversation',
  messageCreated: 'new_message',
  messageDeleted: 'message_deleted',
} as const;

export interface MessageCreatedPayload {
  conversationId: string;
  messageId: string;
  messageType: string;
  createdAt: string;
}

export interface MessageDeletedPayload {
  conversationId?: string;
  messageId: string;
  deletedAt?: string;
}

class SocketClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private accessToken: string | null = null;

  connect(accessToken: string) {
    this.accessToken = accessToken;
    if (this.socket?.connected) return;
    if (this.socket) this.socket.disconnect();

    const baseURL =
      webEnv.NEXT_PUBLIC_API_BASE_URL.replace('/api', '');

    this.socket = io(baseURL, {
      auth: (cb) => cb({ token: this.accessToken }),
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => console.log('[Socket] Connected'));
    this.socket.on('disconnect', (reason) => console.log('[Socket] Disconnected:', reason));
    this.socket.on('connect_error', (err) => console.warn('[Socket] Error:', err.message));

    // Forward backend events to registered listeners
    this.socket.on(SOCKET_EVENTS.messageCreated, (payload: MessageCreatedPayload) => {
      this._dispatch(SOCKET_EVENTS.messageCreated, payload);
    });
    this.socket.on(LEGACY_SOCKET_EVENTS.messageCreated, (payload: MessageCreatedPayload) => {
      this._dispatch(SOCKET_EVENTS.messageCreated, payload);
    });

    this.socket.on(SOCKET_EVENTS.messageDeleted, (payload: MessageDeletedPayload) => {
      this._dispatch(SOCKET_EVENTS.messageDeleted, payload);
    });
    this.socket.on(LEGACY_SOCKET_EVENTS.messageDeleted, (payload: MessageDeletedPayload) => {
      this._dispatch(SOCKET_EVENTS.messageDeleted, payload);
    });
  }

  updateAccessToken(accessToken: string) {
    this.accessToken = accessToken;
    if (!this.socket) return;
    this.socket.auth = { token: accessToken };
    if (this.socket.connected) {
      this.socket.emit(SOCKET_EVENTS.authRefresh, accessToken);
      this.socket.emit(LEGACY_SOCKET_EVENTS.authRefresh, accessToken);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  /** Join a conversation room to receive real-time messages. */
  joinConversation(conversationId: string) {
    if (this.socket?.connected) {
      this.socket.emit(SOCKET_EVENTS.joinConversation, { conversationId });
    }
  }

  /** Leave a conversation room. */
  leaveConversation(conversationId: string) {
    if (this.socket?.connected) {
      this.socket.emit(SOCKET_EVENTS.leaveConversation, { conversationId });
    }
  }

  /** Subscribe to a socket event. Returns an unsubscribe function. */
  on<T = unknown>(event: string, callback: (data: T) => void): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: Function) {
    const cbs = this.listeners.get(event);
    if (cbs) {
      cbs.delete(callback);
      if (cbs.size === 0) this.listeners.delete(event);
    }
  }

  private _dispatch(event: string, data: unknown) {
    this.listeners.get(event)?.forEach((cb) => cb(data));
  }

  get connected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketClient = new SocketClient();
