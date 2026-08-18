import { compare, hash } from 'bcryptjs';
import { UserRole } from '@prisma/client';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { JWT } from 'next-auth/jwt';

import { prisma } from '@/lib/prisma';

const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL ?? 'admin@example.com';

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD ?? 'Admin123!';

const ADMIN_NAME =
  process.env.ADMIN_NAME ?? 'Administrator';

async function ensureDefaultAdminUser() {
  const existingAdmin = await prisma.user.findUnique({
    where: {
      email: ADMIN_EMAIL,
    },
  });

  if (existingAdmin) {
    return existingAdmin;
  }

  const hashedPassword = await hash(
    ADMIN_PASSWORD,
    10,
  );

  return prisma.user.create({
    data: {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: UserRole.ADMIN,
    },
  });
}

type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
};

type AuthToken = JWT & {
  id?: string;
  role?: UserRole;
  phone?: string | null;
};

export async function findAuthenticatedUser(
  identifier: string,
  password: string,
): Promise<AuthenticatedUser | null> {
  // Đảm bảo tài khoản Admin mặc định tồn tại.
  await ensureDefaultAdminUser();

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        {
          email: identifier,
        },
        {
          phone: identifier,
        },
      ],
    },
  });

  if (!user) {
    return null;
  }

  const passwordValid = await compare(
    password,
    user.password,
  );

  if (!passwordValid) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },

  pages: {
    signIn: '/dang-nhap',
  },

  providers: [
    CredentialsProvider({
      name: 'Credentials',

      credentials: {
        identifier: {
          label: 'Email hoặc số điện thoại',
          type: 'text',
          placeholder: 'Email hoặc số điện thoại',
        },

        password: {
          label: 'Mật khẩu',
          type: 'password',
        },
      },

      async authorize(credentials) {
        const identifier =
          credentials?.identifier?.trim();

        const password =
          credentials?.password ?? '';

        if (!identifier || !password) {
          return null;
        }

        return findAuthenticatedUser(
          identifier,
          password,
        );
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const typedUser =
          user as AuthenticatedUser;

        const typedToken =
          token as AuthToken;

        typedToken.id = typedUser.id;
        typedToken.role = typedUser.role;
        typedToken.phone = typedUser.phone;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        const typedToken =
          token as AuthToken;

        session.user.id =
          typedToken.id ?? '';

        session.user.role =
          typedToken.role ??
          UserRole.CUSTOMER;

        session.user.phone =
          typedToken.phone ?? null;
      }

      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};