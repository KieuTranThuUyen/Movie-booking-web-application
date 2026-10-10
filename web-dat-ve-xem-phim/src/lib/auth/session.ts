import { getServerSession } from 'next-auth/next';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { UserRole } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { unauthorized, forbidden } from '@/lib/api/errors';
export type SessionUser = {
    id: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    role: UserRole;
};




export async function requireUser(): Promise<SessionUser> {
    const session = await getServerSession(authOptions);
    const user = session?.user;
    if (!user?.id) {
        throw unauthorized();
    }
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone ?? null,
        role: (user.role as UserRole) ?? UserRole.CUSTOMER,
    };
}



export async function requireAdmin(): Promise<SessionUser> {
    const user = await requireUser();
    if (user.role !== UserRole.ADMIN) {
        throw forbidden();
    }
    return user;
}



export async function isAdminFromRequest(request: Request): Promise<boolean> {
    const token = await getToken({
        req: request as NextRequest,
        secret: process.env.NEXTAUTH_SECRET,
    });
    return token?.role === 'ADMIN';
}




export function assertOwnership(user: SessionUser, ownerId: string): void {
    if (user.id !== ownerId && user.role !== UserRole.ADMIN) {
        throw forbidden('Bạn không có quyền truy cập dữ liệu này.');
    }
}
