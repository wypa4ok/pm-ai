"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams()!;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Pre-fill email if provided in query params (from invite)
    const inviteEmail = searchParams.get("email");
    if (inviteEmail) {
      setEmail(decodeURIComponent(inviteEmail));
    }
  }, [searchParams]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch("/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      console.log("Signup API response:", {
        ok: response.ok,
        status: response.status,
        data,
      });

      if (!response.ok) {
        throw new Error(data.message || data.error || "Sign up failed");
      }

      // Check if email confirmation is required
      if (data.requiresEmailConfirmation) {
        setSuccess("Account created! Please check your email to confirm your account, then you can log in.");
        setLoading(false);
        return;
      }

      // After successful signup, redirect to onboarding or return URL
      const returnUrl = searchParams.get("returnUrl");
      if (returnUrl) {
        router.push(decodeURIComponent(returnUrl));
      } else {
        // Redirect to onboarding for new landlords
        router.push("/onboarding");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during sign up");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-deep px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-text-primary">
            {searchParams.get("email")
              ? "Create Your Account"
              : "Start Managing Your Properties"}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            {searchParams.get("email")
              ? "Complete your registration to access your tenant portal"
              : "Join hundreds of landlords managing their properties more efficiently"}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-md border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
            {success}
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-text-secondary">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-secondary">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              readOnly={!!searchParams.get("email")}
              className="mt-1 block w-full rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent/30 read-only:opacity-60"
              placeholder="you@example.com"
            />
            {searchParams.get("email") && (
              <p className="mt-1 text-xs text-text-muted">
                This email is from your invitation
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-secondary">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1 block w-full rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
              placeholder="At least 6 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface-deep hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-text-secondary">
            Already have an account?{" "}
            <a
              href={`/auth/login${searchParams.get("returnUrl") ? `?returnUrl=${searchParams.get("returnUrl")}` : ""}`}
              className="font-medium text-accent hover:text-accent-hover"
            >
              Log in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpContent />
    </Suspense>
  );
}
