'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { messagingAPI } from '@/lib/api/messaging';
import { useAuthStore } from '@/lib/store/authStore';
import { socketClient, type MessageCreatedPayload } from '@/lib/socket/client';
import { Button } from '@/components/ui/Button';
import type { Message } from '@/types';

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load conversation metadata
  const { data: conversation } = useQuery({
    queryKey: ['conversation', id],
    queryFn: () => messagingAPI.getConversationById(id),
    enabled: !!id,
  });

  // Load message history
  const { isLoading } = useQuery({
    queryKey: ['messages', id],
    queryFn: () => messagingAPI.getMessages(id),
    enabled: !!id,
    select: (msgs: Message[]) => msgs,
    onSuccess: (msgs: Message[]) => {
      setMessages(msgs);
      setTimeout(() => scrollToBottom(), 50);
    },
  } as any);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Join socket room and listen for new messages
  useEffect(() => {
    if (!id) return;

    socketClient.joinConversation(id);
    messagingAPI.markAsRead(id).catch(() => {});

    const unsubscribe = socketClient.on<MessageCreatedPayload>('messaging.message.created', async (payload) => {
      if (!payload || payload.conversationId !== id) return;
      const latestMessages = await messagingAPI.getMessages(id);
      setMessages(latestMessages);
      setTimeout(scrollToBottom, 50);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });

    return () => {
      socketClient.leaveConversation(id);
      unsubscribe();
    };
  }, [id, queryClient, scrollToBottom]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSendError('');
    setSending(true);
    try {
      const msg = await messagingAPI.sendMessage(id, text);
      setDraft('');
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setTimeout(scrollToBottom, 50);
    } catch (err: any) {
      setSendError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const otherUser =
    user?.id === conversation?.customer_id ? conversation?.provider : conversation?.customer;

  const renderMessageContent = (msg: Message, isOwn: boolean) => {
    if (msg.message_type === 'voice' && msg.attachment_url) {
      return (
        <div className="space-y-2">
          <p className={`text-xs ${isOwn ? 'text-primary-200' : 'text-gray-500'}`}>Voice recording</p>
          <audio controls src={msg.attachment_url} className="w-full max-w-xs" preload="none" />
          {msg.body ? <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p> : null}
        </div>
      );
    }
    return <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>;
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200 mb-4">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700 text-sm">
          ←
        </button>
        <div>
          <h1 className="font-semibold text-gray-900">{otherUser?.full_name || 'Conversation'}</h1>
          {conversation?.job && (
            <p className="text-xs text-gray-500">Re: {conversation.job.title}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8 text-sm">
            No messages yet — say hello!
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    isOwn
                      ? 'bg-primary-600 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                  }`}
                >
                  {msg.is_deleted ? (
                    <span className="italic text-sm opacity-60">Message deleted</span>
                  ) : (
                    renderMessageContent(msg, isOwn)
                  )}
                  <p className={`text-xs mt-1 ${isOwn ? 'text-primary-200' : 'text-gray-400'}`}>
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="pt-4 border-t border-gray-200 mt-4">
        {sendError && (
          <p className="text-red-600 text-sm mb-2">{sendError}</p>
        )}
        <div className="flex gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
            rows={2}
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
          <Button
            onClick={handleSend}
            isLoading={sending}
            disabled={!draft.trim() || sending}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
