"use client";

import { SectionTitle } from "@/components/Pane";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { intl } from "@/lib/locale";
import type { MailFailure } from "@/lib/invoiceMail";
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
  /** Present once the database has spent a number on this month. */
  invoiceNumber: string | null;
  /** The agreed day has gone by. Said beside the state, never instead of it. */
  overdue: boolean;
  /** Oldest first: one mark per month, six of them. */
  history: {
    period: string;
    label: string;
    longLabel: string;
    state: MonthState | "none";
    /** The day it was paid, YYYY-MM-DD. */
    paidOn: string | null;
    /** The month's own amount, once it has a row. */
    amountCents: number | null;
    invoiceNumber: string | null;
  }[];
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
  companyReady,
  problem,
  sendFailure = null,
  sent = false,
}: {
  client: BillingClient;
  period: string;
  periodLabel: string;
  /** Her company is on file, so an invoice can carry its mandatory mentions. */
  companyReady: boolean;
  problem?: "entreprise" | "echec" | "envoi" | "adresse" | null;
  /** Why the e-mail provider refused, when it did. */
  sendFailure?: MailFailure | null;
  /** The invoice has just gone out by e-mail. */
  sent?: boolean;
}) {
  const t = useTranslations("billing");
  const tInvoice = useTranslations("invoice");
  const tCompany = useTranslations("company");
  const locale = intl(useLocale());
  const [, startTransition] = useTransition();

  const [amount, setAmount] = useState(client.amountCents);
  const [type, setType] = useState<BillingType>(client.type);
  const [day, setDay] = useState(client.dayOfMonth);
  const [pack, setPack] = useState(client.packSessions);

  // A month of the six opened from its tile, to settle it late (2 Oct 2026).
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const opened = client.history.find((h) => h.period === openMonth) ?? null;
  const today = new Date().toISOString().slice(0, 10);
  const [paidOn, setPaidOn] = useState(today);

  // A different row was picked: adopt its values rather than keeping the last.
  const shown = useRef(client.id);
  useEffect(() => {
    if (shown.current === client.id) return;
    shown.current = client.id;
    setAmount(client.amountCents);
    setType(client.type);
    setDay(client.dayOfMonth);
    setPack(client.packSessions);
    setOpenMonth(null);
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

  function setPastState(month: NonNullable<typeof opened>, state: MonthState, on?: string) {
    const body = new FormData();
    body.set("client_id", client.id);
    body.set("period", month.period);
    body.set("amount", ((month.amountCents ?? amount) / 100).toFixed(2));
    body.set("state", state);
    if (on) body.set("paid_on", on);
    startTransition(() => {
      void setMonthStatus(body);
    });
  }

  function setState(state: MonthState) {
    const body = new FormData();
    body.set("client_id", client.id);
    body.set("period", period);
    body.set("amount", (amount / 100).toFixed(2));
    body.set("state", state);
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
        t("reminderBody", { amount: euros(amount, locale), month: periodLabel }),
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
              {euros(amount, locale)}
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
              ? t("amountNoteMonthly", { day: dayLabel(day, locale) })
              : t("amountNotePack")}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <SectionTitle icon="billing">{t("howTheyPay")}</SectionTitle>
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
                {t("billedOn", { day: dayLabel(day, locale) })}
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
                  {dayLabel(value, locale)}
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
                {t("packEach", { price: euros(perSession, locale) })}
              </span>
            </div>
            <p className="text-[12px] leading-[1.45] text-[var(--ink3)]">{t("packNote")}</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <SectionTitle icon="checkIns">{t("thisMonth")}</SectionTitle>
          {/* Three states, all of them hers to pick. Whether the day has gone
              by is said underneath, so choosing one never contradicts it. */}
          <div className="grid grid-cols-3 gap-2">
            <Chip on={paid} onClick={() => setState("paid")}>
              {t("paid")}
            </Chip>
            <Chip
              on={client.state === "awaiting"}
              onClick={() => setState("awaiting")}
            >
              {t("awaiting")}
            </Chip>
            <Chip on={client.state === "late"} onClick={() => setState("late")}>
              {t("late")}
            </Chip>
          </div>

          <button
            type="button"
            onClick={() => setState(paid ? "awaiting" : "paid")}
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
                : client.overdue
                  ? t("dueDayPassed", { day: dayLabel(day, locale) })
                  : t("notReceived")}
            </span>
          </button>
          {/* A paid month, or an issued invoice, is closed (2 Oct 2026): the
              database keeps its amount; a new rate applies to next month. */}
          {(paid || client.issued) && (
            <p className="flex items-start gap-2 text-[12px] leading-[1.45] text-[var(--ink2)]">
              <span aria-hidden>🔒</span>
              <span>{paid ? t("lockedPaid") : t("lockedIssued")}</span>
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <SectionTitle icon="chart">{t("lastSixMonths")}</SectionTitle>
          <div className="flex gap-1.5">
            {client.history.map((h) => {
              const on = h.period === openMonth;
              return (
                <button
                  key={h.period}
                  type="button"
                  aria-pressed={on}
                  aria-label={h.longLabel}
                  onClick={() => {
                    setOpenMonth(on ? null : h.period);
                    setPaidOn(h.paidOn ?? today);
                  }}
                  className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-r2 border px-1 py-2 ${
                    on ? "sel" : "glass2 border-transparent"
                  }`}
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
                </button>
              );
            })}
          </div>
          {!opened && <p className="text-[11.5px] text-[var(--ink3)]">{t("monthTapHint")}</p>}

          {/* The month opened: its state, and the day it was paid. */}
          {opened && (
            <div className="glass2 flex flex-col gap-2.5 rounded-r2 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-semibold first-letter:uppercase">{opened.longLabel}</span>
                <span className="tnum text-[12.5px] text-[var(--ink2)]">
                  {euros(opened.amountCents ?? amount, locale)}
                  {opened.invoiceNumber ? ` · ${opened.invoiceNumber}` : ""}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Chip on={opened.state === "paid"} onClick={() => setPastState(opened, "paid", paidOn)}>
                  {t("paid")}
                </Chip>
                <Chip on={opened.state === "awaiting"} onClick={() => setPastState(opened, "awaiting")}>
                  {t("awaiting")}
                </Chip>
                <Chip on={opened.state === "late"} onClick={() => setPastState(opened, "late")}>
                  {t("late")}
                </Chip>
              </div>
              <label className="flex flex-wrap items-center gap-2 text-[12.5px] text-[var(--ink2)]">
                {t("paidOn")}
                <input
                  type="date"
                  value={paidOn}
                  max={today}
                  onChange={(event) => setPaidOn(event.target.value)}
                  className="h-9 rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-2 text-[13px] text-[var(--ink)] max-md:text-[16px]"
                />
                {opened.state === "paid" && paidOn !== opened.paidOn && (
                  <button
                    type="button"
                    onClick={() => setPastState(opened, "paid", paidOn)}
                    className="cta h-9 rounded-r2 px-3 text-[12.5px] font-semibold text-[var(--onA)]"
                  >
                    {t("savePaidOn")}
                  </button>
                )}
              </label>
              <p className="text-[11.5px] leading-[1.45] text-[var(--ink3)]">
                {opened.state === "paid" && opened.paidOn
                  ? t("paidOnSaid", { date: new Date(`${opened.paidOn}T12:00:00Z`).toLocaleDateString(locale, { day: "numeric", month: "long" }) })
                  : t("paidOnHint")}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {client.invoiceNumber ? (
            <Link
              href={`/facturation/${client.id}/${period}`}
              className="glass2 flex h-10 min-w-0 flex-1 basis-32 items-center justify-center rounded-r2 px-3 text-[13px] font-semibold text-[var(--ink)]"
            >
              {tInvoice("open")}
            </Link>
          ) : !companyReady ? (
            <Link
              href="/admin?partie=entreprise"
              className="glass2 flex h-10 min-w-0 flex-1 basis-32 items-center justify-center rounded-r2 px-3 text-center text-[12px] font-semibold text-[var(--ink2)]"
            >
              {tInvoice("goToCompany")}
            </Link>
          ) : (
            <form action={issueInvoice} className="min-w-0 flex-1 basis-32">
              <input type="hidden" name="client_id" value={client.id} />
              <input type="hidden" name="period" value={period} />
              <input type="hidden" name="amount" value={(amount / 100).toFixed(2)} />
              <button
                type="submit"
                className="glass2 h-10 w-full rounded-r2 px-3 text-[13px] font-semibold text-[var(--ink)]"
              >
                {t("writeInvoice")}
              </button>
            </form>
          )}
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
        {!companyReady && (
          <p className="text-[12px] leading-[1.45] text-[var(--ink3)]">
            {tCompany("incomplete")}
          </p>
        )}
        {problem === "echec" && (
          <p className="text-[12px] leading-[1.45] text-[var(--a3)]">
            {tInvoice("failed")}
          </p>
        )}
        {/* An e-mail that did not leave says so, and why when that is known. */}
        {problem === "envoi" && (
          <p role="alert" className="text-[12px] leading-[1.45] text-[var(--a3)]">
            {tInvoice("sendFailed")}
            {sendFailure && sendFailure !== "autre" && ` ${tInvoice(`sendWhy.${sendFailure}`)}`}
          </p>
        )}
        {problem === "adresse" && (
          <p role="alert" className="text-[12px] leading-[1.45] text-[var(--a3)]">
            {tInvoice("noAddress")}
          </p>
        )}
        {sent && (
          <p role="status" className="text-[12px] leading-[1.45] text-[var(--accent-soft)]">
            {tInvoice("doneSent")}
          </p>
        )}
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
