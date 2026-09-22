"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  createInvite,
  revokeInvite,
  type CreatedInvite,
} from "@/app/(coach)/clients/actions";

export type PendingInvite = {
  id: string;
  code: string;
  state: string;
  expires_at: string;
};

export function InviteDialog({
  pending,
  label,
}: {
  pending: PendingInvite[];
  label: string;
}) {
  const t = useTranslations("invite");
  const [open, setOpen] = useState(false);
  const [askCycle, setAskCycle] = useState(true);
  const [created, setCreated] = useState<CreatedInvite | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [pendingTransition, startTransition] = useTransition();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) panel.current?.focus();
  }, [open]);

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard blocked: the code is on screen and can be read out.
    }
  }

  function onCreate() {
    startTransition(async () => {
      const result = await createInvite(askCycle);
      if (result) setCreated(result);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setCreated(null);
          setOpen(true);
        }}
        className="h-9 w-full rounded-rp text-[12px] font-semibold text-[var(--onA)]"
        style={{ background: "linear-gradient(140deg, var(--a1), var(--a2))" }}
      >
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          style={{ background: "rgba(2, 10, 16, .62)" }}
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={t("title")}
            tabIndex={-1}
            className="glass lift w-full max-w-[460px] rounded-r4 p-6 outline-none"
          >
            <h2 className="font-display text-[20px] font-extrabold tracking-[-.04em]">
              {t("title")}
            </h2>
            <p className="mt-2 text-[12px] leading-relaxed text-[var(--ink2)]">
              {t("lede")}
            </p>

            {!created ? (
              <>
                <label className="mt-4 flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={askCycle}
                    onChange={(e) => setAskCycle(e.target.checked)}
                    className="mt-0.5 size-4 shrink-0 accent-[var(--a1)]"
                  />
                  <span className="min-w-0">
                    <span className="block text-[12px] font-semibold">
                      {t("askCycle")}
                    </span>
                    <span className="block text-[11px] leading-snug text-[var(--ink3)]">
                      {t("askCycleHint")}
                    </span>
                  </span>
                </label>

                <button
                  type="button"
                  onClick={onCreate}
                  disabled={pendingTransition}
                  className="mt-5 h-10 w-full rounded-r2 bg-[var(--a1)] text-[13px] font-semibold text-[var(--onA)] disabled:opacity-60"
                >
                  {pendingTransition ? t("creating") : t("create")}
                </button>
              </>
            ) : (
              <>
                <p className="mt-5 text-[10px] font-semibold uppercase tracking-wide text-[var(--ink3)]">
                  {t("yourCode")}
                </p>
                <p className="tnum mt-1 select-all break-all font-display text-[26px] font-extrabold tracking-[-.02em] text-[var(--a1)]">
                  {created.code}
                </p>
                <p className="tnum mt-1 text-[11px] text-[var(--ink3)]">
                  {t("expires", { date: created.expiresAt.slice(0, 10) })}
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-[var(--ink2)]">
                  {t("shareHint")}
                </p>

                <button
                  type="button"
                  onClick={() => copy(created.code)}
                  className="mt-4 h-10 w-full rounded-r2 bg-[var(--a1)] text-[13px] font-semibold text-[var(--onA)]"
                >
                  {copied === created.code ? t("copied") : t("copy")}
                </button>
              </>
            )}

            {pending.length > 0 && (
              <div className="mt-5 border-t border-[var(--hair)] pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink3)]">
                  {t("pending", { count: pending.length })}
                </p>
                <ul className="mt-2">
                  {pending.map((invite) => (
                    <li
                      key={invite.id}
                      className="flex items-center gap-2 border-b border-[var(--hair)] py-2 last:border-0"
                    >
                      <span className="tnum min-w-0 flex-1 truncate text-[12px] font-semibold">
                        {invite.code}
                      </span>
                      <span className="tnum shrink-0 text-[10px] text-[var(--ink3)]">
                        {invite.expires_at.slice(0, 10)}
                      </span>
                      <button
                        type="button"
                        onClick={() => copy(invite.code)}
                        className="shrink-0 rounded-r1 border border-[var(--edge)] px-2 py-0.5 text-[10px] text-[var(--ink2)]"
                      >
                        {copied === invite.code ? t("copied") : t("copy")}
                      </button>
                      <form action={revokeInvite} className="shrink-0">
                        <input type="hidden" name="invite_id" value={invite.id} />
                        <button
                          type="submit"
                          className="rounded-r1 border border-[var(--edge)] px-2 py-0.5 text-[10px] text-[var(--ink3)] hover:border-[var(--a3)] hover:text-[var(--a3)]"
                        >
                          {t("revoke")}
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 h-9 w-full rounded-r2 border border-[var(--edge)] text-[12px] text-[var(--ink2)]"
            >
              {t("close")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
