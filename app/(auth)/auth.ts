import NextAuth from 'next-auth';
import CognitoProvider from 'next-auth/providers/cognito';

import { authConfig } from './auth.config';

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    CognitoProvider({
      clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
      clientSecret: process.env.NEXT_PUBLIC_COGNITO_CLIENT_SECRET!,
      issuer: process.env.NEXT_PUBLIC_COGNITO_DOMAIN!, // e.g., https://your-cognito-domain.auth.us-east-1.amazoncognito.com
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }

      return session;
    },
  },
});