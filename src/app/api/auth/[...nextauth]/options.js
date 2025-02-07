import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from "@/lib/prisma";  // Ensure Prisma is imported correctly

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
    /**
     * SIGN-IN CALLBACK
     * - Prevents Prisma errors by checking if `user.email` exists before querying.
     * - Returns `true` for successful sign-in, `false` if an error occurs.
     */
    async signIn({ user }) {
        try {
          if (!user || !user.email) {
            console.error("❌ Sign-in error: Missing user email");
            return false;
          }
      
          let existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          });
      
          if (!existingUser) {
            console.log("🆕 New user detected, creating in database...");
      
            existingUser = await prisma.user.create({
              data: {
                email: user.email,
                username: "", // New users start with an empty username
                createdAt: new Date(),
              },
            });
      
            console.log("✅ New user created:", existingUser);
          }
      
          console.log("✅ User found, proceeding.");
          return true;
        } catch (error) {
          console.error("❌ Error during sign-in:", error);
          return false;
        }
      },

    /**
     * REDIRECT CALLBACK
     * - Ensures users are redirected properly after authentication.
     * - Removed Prisma query (since `url.email` doesn't exist).
     */
    async redirect({ url, baseUrl }) {
        console.log("🔄 Redirecting user...");
        
        // Ensure we don’t redirect in a loop
        if (url.startsWith(baseUrl)) {
          return url;
        }
      
        return baseUrl; // Default to home page
      },

    /**
     * SESSION CALLBACK
     * - Ensures the user's ID is included in the session.
     * - Prevents Prisma errors by checking if user exists before adding `id`.
     */
    async session({ session }) {
        if (!session.user || !session.user.email) {
          console.error("❌ Session error: No user email found.");
          return session;
        }
      
        try {
          let dbUser = await prisma.user.findUnique({
            where: { email: session.user.email },
          });
      
          if (!dbUser) {
            console.warn("⚠️ No database user found in session.");
            return session;
          }
      
          // **Force newUser to be true if it's a new account**
          session.user.id = dbUser.id;
          session.user.newUser = dbUser.username === null || dbUser.username.trim() === "";
      
          console.log("✅ Updated session user:", session.user);
          return session;
        } catch (error) {
          console.error("❌ Error in session callback:", error);
          return session;
        }
      }
  },

  debug: true,  // Enable debugging logs for troubleshooting
};