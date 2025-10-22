"use client";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-100 via-white to-slate-200 p-8 text-center">
      <h1 className="text-3xl font-semibold text-slate-900">
        Rental Ops Starter
      </h1>
      <p className="max-w-xl text-base text-slate-600">
        Kick off the build by working through the tasks in{" "}
        <code className="rounded bg-slate-900/10 px-1 py-0.5 text-xs font-mono">
          codex_tasks.json
        </code>
        .
      </p>
    </main>
  );
}
