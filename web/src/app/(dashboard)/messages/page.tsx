'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { messagingAPI } from '@/lib/api/messaging';
import { useAuthStore } from '@/lib/store/authStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function MessagesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: messagingAPI.getConversations,
  });

  const { mutate: openAdminSupport, isPending: isOpeningAdminSupport } = useMutation({
    mutationFn: messagingAPI.openAdminSupportConversation,
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      router.push(`/messages/${conversation.id}`);
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
        <Button
          type="button"
          isLoading={isOpeningAdminSupport}
          onClick={() => openAdminSupport()}
          className="rounded-full bg-sky-600 text-white hover:bg-sky-700"
        >
          Message TradeConnect Admin Team
        </Button>
      </div>

      {!conversations || conversations.length === 0 ? (
        <Card padding="lg">
          <div className="text-center py-16">
            <p className="text-gray-500">No conversations yet</p>
            <p className="text-sm text-gray-400 mt-2">
              {user?.role === 'provider'
                ? 'Start a conversation from a job, or message TradeConnect Admin Team for support.'
                : 'Conversations will appear here when a provider reaches out about your job, or when you chat with support.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => {
            const isCustomer = user?.id === conv.customer_id;
            const unread = isCustomer
              ? (conv as any).unread_count_customer ?? conv.customer_unread ?? 0
              : (conv as any).unread_count_provider ?? conv.provider_unread ?? 0;
            const otherUser = isCustomer ? conv.provider : conv.customer;

            return (
              <Link key={conv.id} href={`/messages/${conv.id}`}>
                <Card hover padding="lg">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">
                          {otherUser?.full_name || 'User'}
                        </span>
                        {unread > 0 && (
                          <span className="bg-primary-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                            {unread}
                          </span>
                        )}
                      </div>
                      {conv.job && (
                        <p className="text-xs text-gray-400 mb-1 truncate">
                          Re: {conv.job.title}
                        </p>
                      )}
                      {conv.last_message && (
                        <p className="text-sm text-gray-600 truncate">
                          {conv.last_message}
                        </p>
                      )}
                    </div>
                    {conv.last_message_at && (
                      <span className="text-xs text-gray-400 shrink-0">
                        {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
