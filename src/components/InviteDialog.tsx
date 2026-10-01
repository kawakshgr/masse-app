"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ChoiceTiles, ToggleTile } from "@/components/ChoiceTiles";
import { CALL_MINUTES, type CallMinutes } from "@/lib/supabase/types";
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
  const format = useFormatter();
  // "13 octobre", not "2026-10-13".
  const day = (iso: string) => format.dateTime(new Date(iso), { day: "numeric", month: "long" });
  const [open, setOpen] = useState(false);
  const [askCycle, setAskCycle] = useState(true);
  // A video call is offered only when she ticks it (29 Sep 2026).
  const [offerCall, setOfferCall] = useState(false);
  const [callMinutes, setCallMinutes] = useState<CallMinutes>(20);
  // "Valider avant d'ouvrir": the sign-up is a request she accepts or refuses.
  // It follows the video call until she sets it herself.
  const [approval, setApproval] = useState<boolean | null>(null);
  const needsApproval = approval ?? offerCall;
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
      const result = await createInvite(askCycle, offerCall ? callMinutes : null, needsApproval);
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
        className="h-10 w-full rounded-r2 text-[13px] font-semibold text-[var(--on-accent)]"
        style={{ background: "linear-gradient(140deg, var(--a1), var(--a2))" }}
      >
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          style={{ background: "rgba(0, 0, 0, .58)" }}
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
            className="chrome lift max-h-[calc(100dvh-24px)] w-full max-w-[600px] overflow-y-auto rounded-r4 p-6 outline-none"
          >
            <h2 className="font-display text-[24px] font-extrabold uppercase leading-none tracking-[-.01em]">
              {t("title")}
            </h2>
            <p className="mt-2 text-[13px] leading-[1.5] text-[var(--ink2)]">
              {t("lede")}
            </p>

            {!created ? (
              <>
                {/* Big tiles to switch on, as everywhere a choice is few (1 Oct 2026). */}
                <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
                  <ToggleTile icon="cycle" label={t("askCycle")} hint={t("askCycleHint")} on={askCycle} onChange={setAskCycle} />
                  <ToggleTile icon="video" label={t("offerCall")} hint={t("offerCallHint")} on={offerCall} onChange={setOfferCall} />
                  <ToggleTile icon="checkIns" label={t("needsApproval")} hint={t("needsApprovalHint")} on={needsApproval} onChange={setApproval} />
                </div>

                {offerCall && (
                  <div className="mt-3">
                    <p className="mb-2 text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">{t("callLength")}</p>
                    <ChoiceTiles
                      label={t("callLength")}
                      columns={4}
                      value={String(callMinutes)}
                      onChange={(v) => setCallMinutes(Number(v) as CallMinutes)}
                      options={CALL_MINUTES.map((m) => ({ value: String(m), big: String(m), label: "min" }))}
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={onCreate}
                  disabled={pendingTransition}
                  className="mt-5 h-10 w-full rounded-r2 cta text-[14px] font-semibold text-[var(--on-accent)] disabled:opacity-60"
                >
                  {pendingTransition ? t("creating") : t("create")}
                </button>
              </>
            ) : (
              <>
                <p className="mt-5 text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
                  {t("yourCode")}
                </p>
                <p className="tnum mt-1 select-all break-all font-display text-[26px] font-extrabold tracking-[-.03em] text-[var(--accent)]">
                  {created.code}
                </p>
                <p className="tnum mt-1 text-[12px] text-[var(--ink3)]">
                  {t("expires", { date: day(created.expiresAt) })}
                </p>
                <p className="mt-2 text-[12px] leading-[1.5] text-[var(--ink2)]">
                  {t("shareHint")}
                </p>

                <button
                  type="button"
                  onClick={() => copy(created.code)}
                  className="mt-4 h-10 w-full rounded-r2 cta text-[14px] font-semibold text-[var(--on-accent)]"
                >
                  {copied === created.code ? t("copied") : t("copy")}
                </button>
              </>
            )}

            {pending.length > 0 && (
              <div className="mt-5 border-t border-[var(--hair)] pt-3">
                <p className="text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
                  {t("pending", { count: pending.length })}
                </p>
                <ul className="mt-2">
                  {pending.map((invite) => (
                    <li
                      key={invite.id}
                      className="flex items-center gap-2 border-b border-[var(--hair)] py-2 last:border-0"
                    >
                      <span className="tnum min-w-0 flex-1 truncate text-[13px] font-semibold">
                        {invite.code}
                      </span>
                      <span className="tnum shrink-0 text-[11px] text-[var(--ink3)]">
                        {day(invite.expires_at)}
                      </span>
                      <button
                        type="button"
                        onClick={() => copy(invite.code)}
                        className="shrink-0 rounded-r1 border border-[var(--edge)] px-2 py-0.5 text-[11px] text-[var(--ink2)]"
                      >
                        {copied === invite.code ? t("copied") : t("copy")}
                      </button>
                      <form action={revokeInvite} className="shrink-0">
                        <input type="hidden" name="invite_id" value={invite.id} />
                        <button
                          type="submit"
                          className="rounded-r1 border border-[var(--edge)] px-2 py-0.5 text-[11px] text-[var(--ink3)] hover:border-[var(--a3)] hover:text-[var(--a3)]"
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
              className="mt-4 h-9 w-full rounded-r2 border border-[var(--edge)] text-[13px] text-[var(--ink2)]"
            >
              {t("close")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
