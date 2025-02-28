"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 w-full bg-background shadow-md border-b border-gray-300 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        {/* 🏠 Logo */}
        <Link href="/" className="text-3xl font-retro text-primary tracking-widest">
          FightFeed
        </Link>

        {/* 🌐 Desktop Navigation */}
        <div className="hidden md:flex space-x-8 font-semibold text-textDark">
          <Link href="/" className="hover:text-primary transition">Home</Link>
          <Link href="/profile" className="hover:text-primary transition">Profile</Link>
          <Link href="/scorecards" className="hover:text-primary transition">Scorecards</Link>
          <Link href="/events" className="hover:text-primary transition">Events</Link>
          <Link href="/community" className="hover:text-primary transition">Community</Link>
        </div>

        {/* 👤 User Options (Desktop) */}
        {session?.user ? (
          <button
            onClick={() => signOut()}
            className="hidden md:block bg-primary text-white px-6 py-2 rounded-custom font-semibold hover:bg-opacity-90 transition"
          >
            Sign Out
          </button>
        ) : (
          <button
            onClick={() => signIn()}
            className="hidden md:block bg-secondary text-white px-6 py-2 rounded-custom font-semibold hover:bg-opacity-90 transition"
          >
            Sign In
          </button>
        )}

        {/* 📱 Mobile Menu Button */}
        <button className="md:hidden text-3xl" onClick={() => setMenuOpen(!menuOpen)}>
          ☰
        </button>
      </div>

      {/* 📱 Mobile Navigation Menu */}
      {menuOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-background shadow-md border-b border-gray-300">
          <div className="flex flex-col items-center space-y-4 py-4 font-semibold text-textDark">
            <Link href="/" className="hover:text-primary transition" onClick={() => setMenuOpen(false)}>Home</Link>
            <Link href="/profile" className="hover:text-primary transition" onClick={() => setMenuOpen(false)}>Profile</Link>
            <Link href="/scorecards" className="hover:text-primary transition" onClick={() => setMenuOpen(false)}>Scorecards</Link>
            <Link href="/events" className="hover:text-primary transition" onClick={() => setMenuOpen(false)}>Events</Link>
            <Link href="/community" className="hover:text-primary transition" onClick={() => setMenuOpen(false)}>Community</Link>

            {/* 👤 User Options (Mobile) */}
            {session?.user ? (
              <button onClick={() => signOut()} className="bg-primary text-white px-6 py-2 rounded-custom font-semibold hover:bg-opacity-90 transition">
                Sign Out
              </button>
            ) : (
              <button onClick={() => signIn()} className="bg-secondary text-white px-6 py-2 rounded-custom font-semibold hover:bg-opacity-90 transition">
                Sign In
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}