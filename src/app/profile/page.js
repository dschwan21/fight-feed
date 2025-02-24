"use client";

import { useSession } from "next-auth/react";

export default function ProfilePage() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <div className="page-container">
      {/* User Header */}
      <div className="flex items-center gap-4 mb-6">
        <img
          src={user?.image || "/default-avatar.png"}
          alt="Profile"
          className="w-24 h-24 rounded-full border-4 border-primary"
        />
        <div>
          <h1 className="text-4xl font-retro">{user?.username || "User"}</h1>
          <p className="text-gray-500">{user?.email}</p>
        </div>
      </div>

      {/* User Activity Feed */}
      <div className="card">
        <h2 className="text-3xl">Recent Activity</h2>
        <ul className="mt-4 space-y-4">
          <li className="border-b pb-2">📢 Joined a discussion on Fight Night</li>
          <li className="border-b pb-2">✍️ Posted a new blog about UFC 300</li>
          <li>🥊 Scored Adames vs Sheeraz (115-113)</li>
        </ul>
      </div>
    </div>
  );
}
