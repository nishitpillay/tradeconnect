'use client';

import { useAuthStore } from '@/lib/store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard" className="text-2xl font-bold text-primary-600">
                TradeConnect
              </Link>
              <div className="hidden md:flex space-x-4">
                <Link
                  href="/dashboard"
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </Link>
                {user.role === 'customer' && (
                  <>
                    <Link
                      href="/jobs/new"
                      className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Post Job
                    </Link>
                    <Link
                      href="/jobs"
                      className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      My Jobs
                    </Link>
                  </>
                )}
                {user.role === 'provider' && (
                  <>
                    <Link
                      href="/jobs/feed"
                      className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Browse Jobs
                    </Link>
                    <Link
                      href="/quotes"
                      className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      My Quotes
                    </Link>
                  </>
                )}
                <Link
                  href="/messages"
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Messages
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/profile"
                className="text-sm text-gray-700 hover:text-primary-600 font-medium"
              >
                {user.full_name} <span className="text-gray-500">({user.role})</span>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
