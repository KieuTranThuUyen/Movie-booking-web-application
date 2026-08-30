'use client';

import { useSession } from 'next-auth/react';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

export function AdminSidebarWrapper() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return null;
  }

  // Không phải admin thì không hiện sidebar
  if (session?.user?.role !== 'ADMIN') {
    return null;
  }

  return <AdminSidebar />;
}