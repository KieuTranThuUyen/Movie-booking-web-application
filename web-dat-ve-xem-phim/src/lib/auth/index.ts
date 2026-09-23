import { compare, hash } from 'bcryptjs';
import { randomBytes } from 'crypto';
import { UserRole } from '@prisma/client';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import type { JWT } from 'next-auth/jwt';

import { prisma } from '@/lib/db/prisma';

type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  emailVerified: Date;
};

async function upsertGoogleUser(email: string, name: string, image?: string | null) {
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    return prisma.user.update({
      where: { id: existingUser.id },
      data: {
        name: name || existingUser.name,
        image: image ?? existingUser.image,
        emailVerified: existingUser.emailVerified ?? new Date(),
      },
    });
  }

  return prisma.user.create({
    data: {
      name: name || email,
      email,
      image: image ?? undefined,
      password: await hash(randomBytes(32).toString('hex'), 12),
      emailVerified: new Date(),
    },
  });
}

type AuthToken = JWT & {
  id?: string;
  role?: UserRole;
  phone?: string | null;
};

export async function findAuthenticatedUser(
  identifier: string,
  password: string,
): Promise<AuthenticatedUser | null> {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier },
        { phone: identifier },
      ],
    },
  });

  if (!user) {
    return null;
  }

  const passwordValid = await compare(password, user.password);

  if (!passwordValid) {
    return null;
  }

  if (!user.emailVerified) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    emailVerified: user.emailVerified,
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
        const identifier = credentials?.identifier?.trim();
        const password = credentials?.password ?? '';

        if (!identifier || !password) {
          return null;
        }

        return findAuthenticatedUser(identifier, password);
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],

  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== 'google') {
        return true;
      }

      const googleProfile = profile as
        | (typeof profile & { email_verified?: boolean; picture?: string | null })
        | undefined;
      const email = googleProfile?.email?.trim().toLowerCase();
      if (!email || googleProfile?.email_verified === false) {
        return false;
      }

      await upsertGoogleUser(email, googleProfile?.name ?? email, googleProfile?.picture);
      return true;
    },

    async jwt({ token, user }) {
      const email = user?.email ?? token.email;
      if (email) {
        const databaseUser = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });
        if (databaseUser) {
          const typedToken = token as AuthToken;

          typedToken.id = databaseUser.id;
          typedToken.role = databaseUser.role;
          typedToken.phone = databaseUser.phone;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        const typedToken = token as AuthToken;

        session.user.id = typedToken.id ?? '';
        session.user.role = typedToken.role ?? UserRole.CUSTOMER;
        session.user.phone = typedToken.phone ?? null;
      }

      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};