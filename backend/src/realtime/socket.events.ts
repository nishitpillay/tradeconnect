export const SOCKET_EVENTS = {
  authRefresh: 'auth.refresh',
  joinConversation: 'conversation.join',
  leaveConversation: 'conversation.leave',
  messageCreated: 'messaging.message.created',
  messageDeleted: 'messaging.message.deleted',
} as const;

// Temporary aliases for backward compatibility while clients migrate.
export const LEGACY_SOCKET_EVENTS = {
  authRefresh: 'auth:refresh',
  joinConversation: 'join_conversation',
  leaveConversation: 'leave_conversation',
  messageCreated: 'new_message',
  messageDeleted: 'message_deleted',
} as const;

export function userRoom(userId: string): string {
  return `user:${userId}`;
}

export function conversationRoom(conversationId: string): string {
  return `conversation:${conversationId}`;
}

