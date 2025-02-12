"use client";

import { SessionProvider } from "next-auth/react";
import { createContext, useState, useContext } from "react";

// 🔄 Create authentication context
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  return (
    <AuthContext.Provider value={{ isAuthenticating, setIsAuthenticating }}>
      <SessionProvider>{children}</SessionProvider>
    </AuthContext.Provider>
  );
}

// 🔄 Hook to access global authentication state
export function useAuth() {
  return useContext(AuthContext);
}