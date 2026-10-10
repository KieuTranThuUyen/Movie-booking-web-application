'use client';
import { useSession } from 'next-auth/react';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
export function AdminSidebarWrapper() {
    const { data: session, status } = useSession();
    if (status === 'loading') {
        return null;
    }
    
    if (session?.user?.role !== 'ADMIN') {
        return null;
    }
    return <AdminSidebar />;
}
