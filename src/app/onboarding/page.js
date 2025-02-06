"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Onboarding() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [username, setUsername] = useState("");

  // Redirect to home if user already exists
  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      router.push("/");  // If user is authenticated and exists, go to home
    } else if (status === "unauthenticated") {
      router.push("/api/auth/signin");  // Redirect to sign-in if not authenticated
    }
  }, [status, session, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!session || !session.user) {
      console.error("User session not available.");
      return;
    }

    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: session.user.email,
        username,
      }),
    });

    if (response.ok) {
      router.push("/");  // Redirect to home after successful onboarding
    } else {
      console.error("Failed to onboard user.");
    }
  };

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h1 className="text-3xl font-bold">Complete Your Profile</h1>
        <input
          type="text"
          placeholder="Choose a username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="border border-gray-300 bg-white text-gray-900 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        />
        <button
          type="submit"
          className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Complete Onboarding
        </button>
      </form>
    </div>
  );
}