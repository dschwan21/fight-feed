import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from "@/lib/prisma";  // Ensure Prisma is imported here

export const options = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text", placeholder: "username" },
        password: { label: "Password", type: "password" }
      }
    })
  ],
  
  callbacks: {
    // Fixing the signIn callback
    async signIn({ user }) {
      try {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        // Allow sign-in regardless of user existence
        return true;
      } catch (error) {
        console.error("Error during sign-in:", error);
        return false;
      }
    },

    // Redirect logic handled separately
    async redirect({ url, baseUrl }) {
      try {
        const sessionUser = await prisma.user.findUnique({
          where: { email: url.email },  // Ensure you get the correct user info here
        });

        if (!sessionUser) {
          // Redirect to onboarding if the user doesn't exist
          return `${baseUrl}/onboarding`;
        } else {
          // Redirect to home if the user exists
          return baseUrl;
        }
      } catch (error) {
        console.error("Error during redirect:", error);
        return baseUrl;
      }
    },

    // Add session callback to include additional user info in the session
    async session({ session }) {
      const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email },
      });

      session.user.id = dbUser?.id;  // Safeguard in case dbUser is null
      return session;
    },
  }
};