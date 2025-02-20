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
  session: {
    strategy: "jwt",
  },

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
      
          console.log("🔍 Checking if user exists in DB...");
      
          let existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          });
      
          let newUser = false;
      
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
            newUser = true;
          }
      
          console.log("✅ User found, proceeding.");
      
          return {
            id: existingUser.id,
            name: user.name,
            email: user.email,
            image: user.image,
            newUser: newUser, // **Set `newUser` properly**
          };
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
                include: { profile: true }
            });
    
            if (!dbUser) {
                console.warn("⚠️ No database user found in session.");
                return session;
            }
    
            session.user.id = dbUser.id; // ✅ Ensure user ID is attached
            session.user.newUser = !dbUser.username;
            session.user.bio = dbUser.profile?.bio || "";
            session.user.location = dbUser.profile?.location || "";
    
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