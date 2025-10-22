import type { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <section className="flex min-h-screen flex-col bg-white">
      {children}
    </section>
  );
}
