"use client";

import { SessionProvider } from "next-auth/react";

// Provider de sessão do NextAuth para componentes cliente
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
