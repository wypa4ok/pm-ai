"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/v1/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName || null,
          phone: phone || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Onboarding failed");
      }

      // Redirect to dashboard
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-deep px-4">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-surface p-8 shadow-sm">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-wide text-text-muted">Setup</p>
          <h1 className="mt-1 text-2xl font-semibold text-text-primary">Welcome to Property Management</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Let&apos;s get your account set up so you can start managing your properties
          </p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-surface-deep">
                1
              </div>
              <span className="ml-3 text-sm font-medium text-text-primary">Account Info</span>
            </div>
            <div className="flex-1 mx-4 h-px bg-border" />
            <div className="flex items-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-sm font-semibold text-text-muted">
                2
              </div>
              <span className="ml-3 text-sm text-text-muted">Add Properties</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-text-secondary">
              Company or Business Name <span className="text-text-muted">(Optional)</span>
            </label>
            <input
              id="companyName"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
              placeholder="Acme Property Management"
            />
            <p className="mt-1 text-xs text-text-muted">
              If you manage properties under a business name
            </p>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-text-secondary">
              Phone Number <span className="text-text-muted">(Optional)</span>
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
              placeholder="+1 (555) 123-4567"
            />
            <p className="mt-1 text-xs text-text-muted">
              For tenant communication and account recovery
            </p>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-md border border-border px-5 py-2 text-sm font-medium text-text-secondary hover:bg-surface-raised"
            >
              Skip for Now
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-accent px-5 py-2 text-sm font-medium text-surface-deep hover:bg-accent-hover disabled:opacity-50"
            >
              {loading ? "Saving..." : "Continue to Dashboard"}
            </button>
          </div>
        </form>

        <div className="mt-8 border-t border-border pt-6">
          <h2 className="text-sm font-semibold text-text-primary mb-3">What&apos;s Next?</h2>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li className="flex items-start gap-2">
              <svg className="h-4 w-4 mt-0.5 shrink-0 text-accent" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Add your properties and units
            </li>
            <li className="flex items-start gap-2">
              <svg className="h-4 w-4 mt-0.5 shrink-0 text-accent" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Invite your tenants to the portal
            </li>
            <li className="flex items-start gap-2">
              <svg className="h-4 w-4 mt-0.5 shrink-0 text-accent" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Start managing maintenance requests and tickets
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
