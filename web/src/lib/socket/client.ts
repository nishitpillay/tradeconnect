import { io, Socket } from 'socket.io-client';
import { webEnv } from '@/config/env';

export interface NewMessagePayload {
  conversationId?: string;
  message: {
    id: string;
    conversation_id: string;
    sender_id: string;
    body: string | null;
    message_type: string;
    attachment_url: string | null;
    attachment_mime: string | null;
    is_deleted: boolean;
    read_by_recipient_at: string | null;
    created_at: string;
    sender?: { id: string; full_name: string };
  };
}

export interface MessageDeletedPayload {
  messageId: string;
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
    this.socket.on('new_message', (payload: NewMessagePayload) => {
      this._dispatch('new_message', payload);
    });

    this.socket.on('message_deleted', (payload: MessageDeletedPayload) => {
      this._dispatch('message_deleted', payload);
    });
  }

  updateAccessToken(accessToken: string) {
    this.accessToken = accessToken;
    if (!this.socket) return;
    this.socket.auth = { token: accessToken };
    if (this.socket.connected) {
      this.socket.emit('auth:refresh', accessToken);
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
      this.socket.emit('join_conversation', conversationId);
    }
  }

  /** Leave a conversation room. */
  leaveConversation(conversationId: string) {
    if (this.socket?.connected) {
      this.socket.emit('leave_conversation', conversationId);
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
