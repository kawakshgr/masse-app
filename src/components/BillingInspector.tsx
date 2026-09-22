"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { saveArrangement, setMonthStatus, issueInvoice } from "@/app/(coach)/facturation/actions";
import { dayLabel, euros, type MonthState } from "@/lib/billing";
import type { BillingType } from "@/lib/supabase/types";

const DAY_PRESETS = [1, 5, 15, 28];

const micro = "text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]";
const step =
  "glass2 flex h-[30px] shrink-0 items-center justify-center rounded-r1 text-[12px] font-semibold text-[var(--ink)] active:scale-[.93]";

export type BillingClient = {
  id: string;
  name: string;
  initials: string;
  since: string;
  email: string | null;
  amountCents: number;
  type: BillingType;
  dayOfMonth: number;
  packSessions: number;
  state: MonthState;
  paidWhen: string | null;
  issued: boolean;
  /** Oldest first: one mark per month, six of them. */
  history: { label: string; state: MonthState | "none" }[];
};

function Chip({
  on,
  onClick,
  children,
  tone,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-w-0 truncate rounded-r2 border border-[var(--edge)] px-2.5 py-2.5 text-[13px] font-semibold ${
        on ? "sel text-[var(--ink)]" : `bg-[var(--glass2)] ${tone ?? "text-[var(--ink2)]"}`
      }`}
    >
      {children}
    </button>
  );
}

/**
 * The arrangement edits in place, the way the prototype does: no save button,
 * every change written as it is made. Local state moves first so a stepper does
 * not wait for a round trip, and the server is the one that clamps.
 */
export function BillingInspector({
  client,
  period,
  periodLabel,
}: {
  client: BillingClient;
  period: string;
  periodLabel: string;
}) {
  const t = useTranslations("billing");
  const [, startTransition] = useTransition();

  const [amount, setAmount] = useState(client.amountCents);
  const [type, setType] = useState<BillingType>(client.type);
  const [day, setDay] = useState(client.dayOfMonth);
  const [pack, setPack] = useState(client.packSessions);

  // A different row was picked: adopt its values rather than keeping the last.
  const shown = useRef(client.id);
  useEffect(() => {
    if (shown.current === client.id) return;
    shown.current = client.id;
    setAmount(client.amountCents);
    setType(client.type);
    setDay(client.dayOfMonth);
    setPack(client.packSessions);
  }, [client]);

  function save(next: {
    amountCents?: number;
    type?: BillingType;
    day?: number;
    pack?: number;
  }) {
    const body = new FormData();
    body.set("client_id", client.id);
    body.set("amount", ((next.amountCents ?? amount) / 100).toFixed(2));
    body.set("type", next.type ?? type);
    body.set("day", String(next.day ?? day));
    body.set("pack", String(next.pack ?? pack));
    startTransition(() => {
      void saveArrangement(body);
    });
  }

  function nudgeAmount(euroDelta: number) {
    const next = Math.max(0, amount + euroDelta * 100);
    setAmount(next);
    save({ amountCents: next });
  }

  function togglePaid(paid: boolean) {
    const body = new FormData();
    body.set("client_id", client.id);
    body.set("period", period);
    body.set("amount", (amount / 100).toFixed(2));
    body.set("paid", paid ? "1" : "0");
    startTransition(() => {
      void setMonthStatus(body);
    });
  }

  const paid = client.state === "paid";
  const perSession = pack > 0 ? Math.round(amount / pack) : 0;

  const reminder = client.email
    ? `mailto:${client.email}?subject=${encodeURIComponent(
        t("reminderSubject", { month: periodLabel }),
      )}&body=${encodeURIComponent(
        t("reminderBody", { amount: euros(amount), month: periodLabel }),
      )}`
    : null;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <section className="glass flex flex-col gap-3.5 rounded-r3 p-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-[var(--onA)]"
            style={{ background: "linear-gradient(140deg, var(--a1), var(--a2))" }}
          >
            {client.initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold">{client.name}</p>
            <p className="truncate text-[12px] text-[var(--ink2)]">{client.since}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className={micro}>
            {type === "monthly" ? t("monthlyAmount") : t("packPrice")}
          </span>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => nudgeAmount(-5)} className={`${step} w-8`}>
              −5
            </button>
            <button type="button" onClick={() => nudgeAmount(-1)} className={`${step} w-[30px]`}>
              −1
            </button>
            <span className="tnum min-w-0 flex-1 text-center font-display text-[22px] font-extrabold tracking-[-.03em]">
              {euros(amount)}
            </span>
            <button type="button" onClick={() => nudgeAmount(1)} className={`${step} w-[30px]`}>
              +1
            </button>
            <button type="button" onClick={() => nudgeAmount(5)} className={`${step} w-8`}>
              +5
            </button>
          </div>
          <p className="text-[12px] leading-[1.45] text-[var(--ink3)]">
            {type === "monthly"
              ? t("amountNoteMonthly", { day: dayLabel(day) })
              : t("amountNotePack")}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <span className={micro}>{t("howTheyPay")}</span>
          <div className="grid grid-cols-2 gap-2">
            {(["monthly", "pack"] as const).map((value) => (
              <Chip
                key={value}
                on={type === value}
                onClick={() => {
                  setType(value);
                  save({ type: value });
                }}
              >
                {t(value)}
              </Chip>
            ))}
          </div>
        </div>

        {type === "monthly" ? (
          <div className="flex flex-col gap-2">
            <span className={micro}>{t("billingDay")}</span>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const next = Math.max(1, day - 1);
                  setDay(next);
                  save({ day: next });
                }}
                className={`${step} w-[30px]`}
              >
                −
              </button>
              <span className="tnum min-w-[28px] text-center font-display text-[20px] font-extrabold tracking-[-.02em]">
                {day}
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = Math.min(28, day + 1);
                  setDay(next);
                  save({ day: next });
                }}
                className={`${step} w-[30px]`}
              >
                +
              </button>
              <span className="min-w-[88px] flex-1 text-[12px] leading-[1.4] text-[var(--ink2)]">
                {t("billedOn", { day: dayLabel(day) })}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DAY_PRESETS.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={day === value}
                  onClick={() => {
                    setDay(value);
                    save({ day: value });
                  }}
                  className={`rounded-rp border border-[var(--edge)] px-2.5 py-1.5 text-[12px] font-semibold ${
                    day === value
                      ? "sel text-[var(--ink)]"
                      : "bg-[var(--glass2)] text-[var(--ink2)]"
                  }`}
                >
                  {dayLabel(value)}
                </button>
              ))}
            </div>
            <p className="text-[12px] leading-[1.45] text-[var(--ink3)]">{t("dayNote")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <span className={micro}>{t("packSessions")}</span>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const next = Math.max(1, pack - 1);
                  setPack(next);
                  save({ pack: next });
                }}
                className={`${step} w-[30px]`}
              >
                −
              </button>
              <span className="tnum min-w-[28px] text-center font-display text-[20px] font-extrabold tracking-[-.02em]">
                {pack}
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = Math.min(200, pack + 1);
                  setPack(next);
                  save({ pack: next });
                }}
                className={`${step} w-[30px]`}
              >
                +
              </button>
              <span className="min-w-[88px] flex-1 text-[12px] leading-[1.4] text-[var(--ink2)]">
                {t("packEach", { price: euros(perSession) })}
              </span>
            </div>
            <p className="text-[12px] leading-[1.45] text-[var(--ink3)]">{t("packNote")}</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <span className={micro}>{t("thisMonth")}</span>
          <div className="grid grid-cols-3 gap-2">
            <Chip on={paid} onClick={() => togglePaid(true)}>
              {t("paid")}
            </Chip>
            <Chip on={client.state === "awaiting"} onClick={() => togglePaid(false)}>
              {t("awaiting")}
            </Chip>
            {/* Not a button: lateness is the calendar's verdict, not a choice. */}
            <span
              aria-current={client.state === "late" ? "true" : undefined}
              className={`min-w-0 truncate rounded-r2 border border-[var(--edge)] px-2.5 py-2.5 text-center text-[13px] font-semibold ${
                client.state === "late"
                  ? "text-[var(--a3)]"
                  : "bg-[var(--glass2)] text-[var(--ink3)]"
              }`}
              style={
                client.state === "late"
                  ? { background: "color-mix(in oklab, var(--a3) 22%, var(--glass2))" }
                  : undefined
              }
            >
              {t("late")}
            </span>
          </div>

          <button
            type="button"
            onClick={() => togglePaid(!paid)}
            className="glass2 flex items-center gap-2.5 rounded-r2 p-2.5 text-left"
          >
            <span
              aria-hidden
              className="flex size-5 shrink-0 items-center justify-center rounded-r1 text-[12px] text-[var(--onA)]"
              style={
                paid
                  ? { background: "linear-gradient(120deg, var(--a1), var(--a2))" }
                  : { border: "1px solid var(--edge)" }
              }
            >
              {paid ? "✓" : ""}
            </span>
            <span className="min-w-0 flex-1 text-[13px] font-semibold">
              {paid
                ? t("monthIsPaid", { month: periodLabel })
                : t("markMonthPaid", { month: periodLabel })}
            </span>
            <span className="shrink-0 text-[12px] text-[var(--ink3)]">
              {paid
                ? (client.paidWhen ?? t("received"))
                : client.state === "late"
                  ? t("overdueSince", { day: dayLabel(day) })
                  : t("notReceived")}
            </span>
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className={micro}>{t("lastSixMonths")}</span>
          <div className="flex gap-1.5">
            {client.history.map((h) => (
              <div
                key={h.label}
                className="glass2 flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-r2 px-1 py-2"
              >
                <span className="truncate text-[10px] text-[var(--ink2)]">{h.label}</span>
                <span
                  className={`text-[12px] ${
                    h.state === "paid"
                      ? "text-[var(--accent-soft)]"
                      : h.state === "late"
                        ? "text-[var(--a3)]"
                        : "text-[var(--ink3)]"
                  }`}
                >
                  {h.state === "paid" ? "✓" : h.state === "none" ? "·" : "!"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <form action={issueInvoice} className="min-w-0 flex-1 basis-32">
            <input type="hidden" name="client_id" value={client.id} />
            <input type="hidden" name="period" value={period} />
            <input type="hidden" name="amount" value={(amount / 100).toFixed(2)} />
            <button
              type="submit"
              className="glass2 h-10 w-full rounded-r2 px-3 text-[13px] font-semibold text-[var(--ink)]"
            >
              {client.issued ? t("invoiceReady") : t("writeInvoice")}
            </button>
          </form>
          {/* Opens her own mail client, pre-filled. Masse sends nothing itself. */}
          {reminder ? (
            <a
              href={reminder}
              className={`flex h-10 min-w-0 flex-1 basis-32 items-center justify-center rounded-r2 px-3 text-[13px] font-semibold ${
                paid ? "glass2 text-[var(--ink2)]" : "cta text-[var(--onA)]"
              }`}
            >
              {paid ? t("sendReceipt") : t("sendReminder")}
            </a>
          ) : (
            <span className="glass2 flex h-10 min-w-0 flex-1 basis-32 items-center justify-center rounded-r2 px-3 text-center text-[12px] text-[var(--ink3)]">
              {t("noEmail")}
            </span>
          )}
        </div>
      </section>

      <section
        className="rounded-r3 border border-[var(--edge)] p-4"
        style={{ background: "linear-gradient(150deg, var(--glass2), var(--glass))" }}
      >
        <p className={micro}>{t("nothingAutomatic")}</p>
        <p className="mt-1.5 text-[13px] leading-[1.5] text-[var(--ink2)]">
          {t("nothingAutomaticBody")}
        </p>
      </section>
    </div>
  );
}
