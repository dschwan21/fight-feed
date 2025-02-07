"use client";

import "./globals.css";
import { Inter } from "next/font/google";
import Navbar from "./components/Navbar";
import { SessionProvider } from "next-auth/react";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          <AuthRedirectHandler />
          <Navbar />
          <main className="flex justify-center items-start p-6 min-h-screen">
            {children}
          </main>
        </SessionProvider>
      </body>
    </html>
  );
}

// 🔄 Redirect handler ensures new users are redirected to onboarding
function AuthRedirectHandler() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && !hasChecked) {
      setHasChecked(true); // Prevent multiple executions

      console.log("🔍 Checking session data for redirect:", session?.user);

      // Ensure session is fresh before redirecting
      (async () => {
        const updatedSession = await update();
        console.log("🔄 Session after update:", updatedSession);

        if (updatedSession?.user?.newUser) {
          console.log("🚀 Redirecting to onboarding...");
          router.push("/onboarding");
        }
      })();
    }
  }, [status, session, router, hasChecked, update]);

  return null;
}