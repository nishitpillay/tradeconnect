import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { messagingAPI } from '../../../src/api/messaging.api';
import { useSessionStore } from '../../../src/stores/sessionStore';
import { useSocketStore, type NewMessagePayload } from '../../../src/stores/socketStore';
import type { Message } from '../../../src/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
}

function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function formatDateDivider(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
}

// ── Message Bubble ────────────────────────────────────────────────────────────

interface BubbleProps {
  message: Message;
  isMe: boolean;
  showAvatar: boolean;
}

function MessageBubble({ message, isMe, showAvatar }: BubbleProps) {
  const senderInitial =
    (message.sender?.display_name || message.sender?.full_name || '?').charAt(0).toUpperCase();

  if (message.is_deleted) {
    return (
      <View style={[styles.bubbleRow, isMe && styles.bubbleRowMe]}>
        {!isMe && showAvatar ? (
          <View style={styles.avatarSmall}>
            <Text style={styles.avatarSmallText}>{senderInitial}</Text>
          </View>
        ) : (
          !isMe && <View style={styles.avatarPlaceholder} />
        )}
        <Text style={styles.deletedText}>Message deleted</Text>
      </View>
    );
  }

  if (message.message_type === 'system') {
    return (
      <View style={styles.systemRow}>
        <Text style={styles.systemText}>{message.body}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.bubbleRow, isMe && styles.bubbleRowMe]}>
      {!isMe && showAvatar ? (
        <View style={styles.avatarSmall}>
          <Text style={styles.avatarSmallText}>{senderInitial}</Text>
        </View>
      ) : (
        !isMe && <View style={styles.avatarPlaceholder} />
      )}

      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
        <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
          {message.body}
        </Text>
        <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeThem]}>
          {formatMessageTime(message.created_at)}
          {isMe && message.read_by_recipient_at ? '  ✓✓' : ''}
        </Text>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const { user } = useSessionStore();
  const { joinConversation, leaveConversation, on } = useSocketStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList<Message>>(null);
  const hasScrolledToBottom = useRef(false);

  // ── Load conversation meta ──────────────────────────────────────────────────

  const { data: conversation } = useQuery({
    queryKey: ['conversation', id],
    queryFn: () => messagingAPI.getConversationById(id).then((r) => r.conversation),
    enabled: !!id,
  });

  // ── Load message history ────────────────────────────────────────────────────

  const { isLoading, isError } = useQuery({
    queryKey: ['messages', id],
    queryFn: async () => {
      const result = await messagingAPI.getMessages(id);
      // Messages come newest-first from the backend; reverse for display
      setMessages([...result.messages].reverse());
      return result.messages;
    },
    enabled: !!id,
  });

  // ── Set header title ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!conversation || !user) return;
    const other =
      user.role === 'customer' ? conversation.provider : conversation.customer;
    const name = other?.display_name || other?.full_name || 'Chat';
    navigation.setOptions({ title: name });
  }, [conversation, user, navigation]);

  // ── Mark as read on mount ───────────────────────────────────────────────────

  useEffect(() => {
    if (id) {
      messagingAPI.markAsRead(id).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  }, [id, queryClient]);

  // ── Real-time socket subscription ───────────────────────────────────────────

  useEffect(() => {
    if (!id) return;

    joinConversation(id);

    const unsubscribe = on<NewMessagePayload>('new_message', (payload) => {
      if (!payload.message) return;
      // Only add if it belongs to this conversation
      if (payload.message.conversation_id !== id) return;

      setMessages((prev) => {
        // Deduplicate by id
        if (prev.some((m) => m.id === payload.message.id)) return prev;
        return [...prev, payload.message];
      });

      // Mark as read immediately since screen is open
      messagingAPI.markAsRead(id).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });

    return () => {
      unsubscribe();
      leaveConversation(id);
    };
  }, [id, joinConversation, leaveConversation, on, queryClient]);

  // ── Auto-scroll to bottom on new messages ──────────────────────────────────

  useEffect(() => {
    if (messages.length > 0) {
      // Small delay to allow FlatList to render
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: hasScrolledToBottom.current });
        hasScrolledToBottom.current = true;
      }, 100);
    }
  }, [messages]);

  // ── Send message ────────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    const body = draft.trim();
    if (!body || sending) return;

    setDraft('');
    setSending(true);

    try {
      const result = await messagingAPI.sendMessage(id, body);
      // Append optimistically — socket will also fire for the sender
      setMessages((prev) => {
        if (prev.some((m) => m.id === result.message.id)) return prev;
        return [...prev, result.message];
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to send message. Please try again.');
      setDraft(body); // restore draft
    } finally {
      setSending(false);
    }
  }, [draft, sending, id]);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load messages</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Message list */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          const isMe = item.sender_id === user?.id;
          const prev = messages[index - 1];
          const showAvatar = !isMe && (!prev || prev.sender_id !== item.sender_id);
          const showDivider = !prev || !isSameDay(item.created_at, prev.created_at);

          return (
            <>
              {showDivider && (
                <View style={styles.dateDivider}>
                  <Text style={styles.dateDividerText}>
                    {formatDateDivider(item.created_at)}
                  </Text>
                </View>
              )}
              <MessageBubble message={item} isMe={isMe} showAvatar={showAvatar} />
            </>
          );
        }}
        contentContainerStyle={styles.messageList}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatText}>No messages yet. Say hello!</Text>
          </View>
        }
      />

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Type a message…"
          placeholderTextColor="#9CA3AF"
          multiline
          maxLength={2000}
          returnKeyType="default"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!draft.trim() || sending}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.sendBtnText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
  },

  // Message list
  messageList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  // Date divider
  dateDivider: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateDividerText: {
    fontSize: 12,
    color: '#9CA3AF',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },

  // Bubble rows
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
    maxWidth: '100%',
  },
  bubbleRowMe: {
    flexDirection: 'row-reverse',
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    flexShrink: 0,
  },
  avatarSmallText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  avatarPlaceholder: {
    width: 34, // 28px avatar + 6px margin
    flexShrink: 0,
  },

  // Bubbles
  bubble: {
    maxWidth: '75%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleMe: {
    backgroundColor: '#2563EB',
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
  },
  bubbleTextMe: {
    color: '#FFFFFF',
  },
  bubbleTextThem: {
    color: '#111827',
  },
  bubbleTime: {
    fontSize: 10,
    marginTop: 3,
  },
  bubbleTimeMe: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  bubbleTimeThem: {
    color: '#9CA3AF',
  },

  // System / deleted
  systemRow: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  deletedText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginLeft: 34,
  },

  // Empty state
  emptyChat: {
    flex: 1,
    paddingTop: 80,
    alignItems: 'center',
  },
  emptyChatText: {
    fontSize: 14,
    color: '#9CA3AF',
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 8 : 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    marginRight: 8,
  },
  sendBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#93C5FD',
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
});
