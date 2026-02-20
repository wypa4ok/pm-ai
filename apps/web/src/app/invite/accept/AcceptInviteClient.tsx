"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams()!;
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("Processing your invite...");

  useEffect(() => {
    const tenantId = searchParams.get("tenantId");
    const token = searchParams.get("token");

    if (!tenantId || !token) {
      setStatus("error");
      setMessage("Invalid invite link. Please check the link and try again.");
      return;
    }

    const processInvite = async () => {
      try {
        // First, fetch the invite details to get the tenant's email
        const inviteCheckResponse = await fetch(
          `/api/v1/tenants/invite-info?tenantId=${tenantId}&token=${token}`,
        );

        let tenantEmail = "";
        if (inviteCheckResponse.ok) {
          const inviteData = await inviteCheckResponse.json();
          tenantEmail = inviteData.email || "";
        }

        // Check if user is logged in by calling our API
        const checkAuthResponse = await fetch("/api/v1/auth/me");

        if (!checkAuthResponse.ok) {
          // Not logged in, redirect to signup with tenant email and return URL
          const returnUrl = encodeURIComponent(`/invite/accept?tenantId=${tenantId}&token=${token}`);
          const emailParam = tenantEmail ? `&email=${encodeURIComponent(tenantEmail)}` : "";
          window.location.href = `/auth/signup?returnUrl=${returnUrl}${emailParam}`;
          return;
        }

        const authData = await checkAuthResponse.json();
        const userId = authData.user.id;

        // Accept the invite
        const response = await fetch("/api/v1/tenants/accept", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tenantId,
            token,
            userId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setStatus("error");
          // Show more detailed error message
          if (response.status === 403 && data.message?.includes("This invite is for")) {
            setMessage(data.message);
          } else {
            setMessage(data.message || "Failed to accept invite. Please try again.");
          }
          return;
        }

        setStatus("success");
        setMessage(`Welcome, ${data.tenant.firstName}! Your account has been set up.`);

        // Redirect to tenant portal after 2 seconds
        setTimeout(() => {
          router.push("/tenant");
        }, 2000);
      } catch (error) {
        console.error("Error accepting invite:", error);
        setStatus("error");
        setMessage("An unexpected error occurred. Please try again.");
      }
    };

    processInvite();
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        {status === "processing" && (
          <div className="text-center">
            <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
            <h2 className="mb-2 text-xl font-semibold text-slate-900">Processing Invite</h2>
            <p className="text-sm text-slate-600">{message}</p>
          </div>
        )}

        {status === "success" && (
          <div className="text-center">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-slate-900">Success!</h2>
            <p className="text-sm text-slate-600">{message}</p>
            <p className="mt-4 text-xs text-slate-500">Redirecting to your portal...</p>
          </div>
        )}

        {status === "error" && (
          <div className="text-center">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-slate-900">Error</h2>
            <p className="text-sm text-slate-600">{message}</p>
            <button
              onClick={() => router.push("/")}
              className="mt-6 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Go to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AcceptInviteClient() {
  return (
    <Suspense>
      <AcceptInviteContent />
    </Suspense>
  );
}
