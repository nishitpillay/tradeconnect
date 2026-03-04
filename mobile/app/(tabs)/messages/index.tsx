import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { messagingAPI } from '../../../src/api/messaging.api';
import { useSessionStore } from '../../../src/stores/sessionStore';
import type { Conversation } from '../../../src/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en-AU', { weekday: 'short' });
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

// ── Conversation Row ──────────────────────────────────────────────────────────

interface ConversationRowProps {
  item: Conversation;
  currentUserId: string;
  currentRole: 'customer' | 'provider' | null;
  onPress: (id: string) => void;
}

function ConversationRow({ item, currentUserId, currentRole, onPress }: ConversationRowProps) {
  const otherUser = currentRole === 'customer' ? item.provider : item.customer;
  const otherName = otherUser?.display_name || otherUser?.full_name || 'User';
  const unread = currentRole === 'customer' ? item.customer_unread : item.provider_unread;

  const lastBody = item.last_message?.is_deleted
    ? 'Message deleted'
    : item.last_message?.body || '';

  const preview =
    item.last_message?.sender_id === currentUserId ? `You: ${lastBody}` : lastBody;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onPress(item.id)}
      activeOpacity={0.7}
    >
      {/* Avatar placeholder */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{otherName.charAt(0).toUpperCase()}</Text>
      </View>

      <View style={styles.rowContent}>
        <View style={styles.rowHeader}>
          <Text style={styles.name} numberOfLines={1}>
            {otherName}
          </Text>
          <Text style={styles.time}>{formatTime(item.last_message_at)}</Text>
        </View>

        {item.job?.title ? (
          <Text style={styles.jobTitle} numberOfLines={1}>
            {item.job.title}
          </Text>
        ) : null}

        <View style={styles.rowFooter}>
          <Text
            style={[styles.preview, unread > 0 && styles.previewUnread]}
            numberOfLines={1}
          >
            {preview || 'No messages yet'}
          </Text>
          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function MessagesScreen() {
  const router = useRouter();
  const { user, role } = useSessionStore();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messagingAPI.getConversations().then((r) => r.conversations),
    refetchInterval: 30_000, // poll every 30s as fallback
  });

  const handlePress = useCallback(
    (id: string) => {
      router.push(`/messages/${id}`);
    },
    [router],
  );

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
        <Text style={styles.errorText}>Failed to load conversations</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const conversations = data ?? [];

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationRow
            item={item}
            currentUserId={user?.id ?? ''}
            currentRole={role}
            onPress={handlePress}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563EB" />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySubtitle}>
              Conversations start when a provider submits a quote on your job.
            </Text>
          </View>
        }
        contentContainerStyle={conversations.length === 0 ? styles.emptyContainer : undefined}
      />
    </View>
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
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563EB',
  },
  rowContent: {
    flex: 1,
    minWidth: 0,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    color: '#9CA3AF',
    flexShrink: 0,
  },
  jobTitle: {
    fontSize: 12,
    color: '#2563EB',
    marginBottom: 2,
  },
  rowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  preview: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
    marginRight: 8,
  },
  previewUnread: {
    color: '#111827',
    fontWeight: '500',
  },
  badge: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 76,
  },
  emptyContainer: {
    flex: 1,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
