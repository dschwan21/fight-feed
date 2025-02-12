"use client";

import "./globals.css";
import { Inter } from "next/font/google";
import Navbar from "./components/Navbar";
import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "./context/AuthProvider"; // ✅ Wrap everything with AuthProvider
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "./context/AuthProvider"; // ✅ Ensure this is inside AuthProvider

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider> {/* ✅ Wrap entire app with AuthProvider */}
          <SessionProvider>
            <AuthRedirectHandler />
            <Navbar />
            <main className="flex justify-center items-start p-6 min-h-screen">
              {children}
            </main>
          </SessionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

// 🛠️ **Handles onboarding redirect & loading screen**
function AuthRedirectHandler() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticating } = useAuth(); // ✅ Now it works inside AuthProvider
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "authenticated") {
      if (session?.user?.newUser && pathname !== "/onboarding") {
        console.log("🚀 Redirecting to onboarding...");
        router.replace("/onboarding");
      } else {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [status, session, router, pathname]);

  if (isLoading || isAuthenticating) {
    return <LoadingScreen />;
  }

  return null;
}

// 🕐 **Loading screen to prevent flashing UI**
function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-xl font-semibold">Loading...</p>
    </div>
  );
}