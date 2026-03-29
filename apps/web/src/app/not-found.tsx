export const dynamic = "force-dynamic";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-deep text-text-primary">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-2 text-text-secondary">Page not found</p>
      <Link href="/" className="mt-4 text-accent hover:underline">
        Go home
      </Link>
    </div>
  );
}
