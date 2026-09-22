"use client";

export function RetryButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="mt-5 h-11 w-full rounded-rp bg-[var(--accent)] text-[14px] font-semibold text-[var(--on-accent)]"
    >
      {label}
    </button>
  );
}
