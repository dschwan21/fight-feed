'use client'

// this is only necessary for the client components because the server components are already wrapped in a session provider

import { SessionProvider } from 'next-auth/react'

export default function AuthProvider({ children }) {
    return (
        <SessionProvider>
            {children}
        </SessionProvider>
    )
}