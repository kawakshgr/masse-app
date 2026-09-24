import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import {
  BillingInspector,
  type BillingClient,
} from "@/components/BillingInspector";
import { BillingTable } from "@/components/BillingTable";
import {
  euros,
  lastMonths,
  monthLabel,
  monthStart,
  monthState,
  isOverdue,
  nextMonthOf,
  shortMonth,
  type MonthState,
} from "@/lib/billing";
import type { BillingType, InvoiceStatus } from "@/lib/supabase/types";

type Filter = "all" | "open" | "monthly" | "pack";

const FILTERS: Filter[] = ["all", "open", "monthly", "pack"];

const micro = "text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]";

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ filtre?: string; ligne?: string; probleme?: string }>;
}) {
  const t = await getTranslations("billing");
  const params = await searchParams;
  const filter: Filter = FILTERS.includes(params.filtre as Filter)
    ? (params.filtre as Filter)
    : "all";

  const supabase = await createClient();
  const period = monthStart();
  const months = lastMonths(period, 6);
  const nextMonth = nextMonthOf(period);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [clientsRes, arrangementsRes, invoicesRes, profileRes] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id, name, email, created_at")
        .eq("status", "active")
        .order("name"),
      supabase
        .from("billing_arrangements")
        .select("client_id, amount_cents, type, day_of_month, pack_sessions"),
      supabase
        .from("invoices")
        .select(
          "client_id, period_start, status, paid_at, issued_at, invoice_number",
        )
        .gte("period_start", months[0]),
      supabase
        .from("coach_billing_profiles")
        .select("legal_name, siret")
        .eq("coach_id", user?.id ?? "")
        .maybeSingle(),
    ]);

  // An invoice cannot be written without the mentions it has to carry, so the
  // panel says so rather than offering a button that quietly fails.
  const companyReady =
    profileRes.data?.legal_name != null && profileRes.data?.siret != null;

  const clients = clientsRes.data ?? [];
  const arrangements = new Map(
    (arrangementsRes.data ?? []).map((a) => [a.client_id, a]),
  );
  const invoices = invoicesRes.data ?? [];
  const invoiceAt = new Map(
    invoices.map((i) => [`${i.client_id}:${i.period_start}`, i]),
  );

  const rows = clients.map((client) => {
    const a = arrangements.get(client.id);
    const type: BillingType = a?.type ?? "monthly";
    const amountCents = a?.amount_cents ?? 0;
    const dayOfMonth = a?.day_of_month ?? 1;
    const packSessions = a?.pack_sessions ?? 10;
    const current = invoiceAt.get(`${client.id}:${period}`) ?? null;
    const state = monthState((current?.status ?? null) as InvoiceStatus | null);

    return {
      id: client.id,
      name: client.name,
      email: client.email,
      since: t("clientSince", {
        date: new Date(client.created_at).toLocaleDateString("fr-FR", {
          month: "long",
          year: "numeric",
        }),
      }),
      amountCents,
      type,
      dayOfMonth,
      packSessions,
      state,
      paidWhen: current?.paid_at
        ? t("receivedOn", {
            date: new Date(current.paid_at).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
            }),
          })
        : null,
      issued: current?.issued_at != null,
      invoiceNumber: current?.invoice_number ?? null,
      overdue: isOverdue(period, dayOfMonth),
      history: months.map((m) => {
        const row = invoiceAt.get(`${client.id}:${m}`);
        return {
          label: shortMonth(m),
          state: (row == null
            ? "none"
            : monthState(row.status as InvoiceStatus)) as MonthState | "none",
        };
      }),
    };
  });

  // Every figure below is derived from the rows beside it, never stored.
  const open = rows.filter((r) => r.state !== "paid");
  const monthly = rows.filter((r) => r.type === "monthly");
  const packs = rows.filter((r) => r.type === "pack");
  const recurring = monthly.reduce((sum, r) => sum + r.amountCents, 0);
  const collected = rows
    .filter((r) => r.state === "paid")
    .reduce((sum, r) => sum + r.amountCents, 0);
  const owed = open.reduce((sum, r) => sum + r.amountCents, 0);

  const shown =
    filter === "open"
      ? open
      : filter === "monthly"
        ? monthly
        : filter === "pack"
          ? packs
          : rows;

  const selected =
    shown.find((r) => r.id === params.ligne) ?? shown[0] ?? rows[0] ?? null;
  const periodLabel = monthLabel(period);

  const totals = [
    {
      label: t("recurring"),
      value: euros(recurring),
      sub: t("monthlyClients", { count: monthly.length }),
      tone: "",
    },
    {
      label: t("collected"),
      value: euros(collected),
      sub: t("settled", {
        settled: rows.length - open.length,
        total: rows.length,
      }),
      tone: "",
    },
    {
      label: t("stillOpen"),
      value: euros(owed),
      sub:
        open.length === 0
          ? t("nothingOutstanding")
          : open.map((r) => r.name.split(" ")[0]).join(", "),
      tone: owed > 0 ? "text-[var(--a3)]" : "",
    },
    {
      label: t("packsLive"),
      value: String(packs.length),
      sub: t("packsLiveSub"),
      tone: "",
    },
  ];

  if (clients.length === 0) {
    return (
      <div className="min-w-0 flex-1 overflow-y-auto p-5">
        <h2 className="font-display text-[22px] font-extrabold tracking-[-.03em]">
          {t("title")}
        </h2>
        <p className="mt-1 text-[13px] leading-[1.5] text-[var(--ink2)]">
          {t("lede")}
        </p>
        <p className="mt-4 text-[13px] text-[var(--ink3)]">{t("noClients")}</p>
      </div>
    );
  }

  return (
    <div className="@container flex min-w-0 flex-1 flex-col gap-3.5 overflow-y-auto p-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-[23px] font-extrabold tracking-[-.03em]">
            {t("titleMonth", { month: periodLabel })}
          </h2>
          <p className="mt-1 text-[13px] text-[var(--ink2)]">
            {open.length === 0
              ? t("subSettled", { recurring: euros(recurring) })
              : t("subOpen", {
                  recurring: euros(recurring),
                  count: open.length,
                  owed: euros(owed),
                })}
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          {FILTERS.map((value) => (
            <Link
              key={value}
              href={`/facturation?filtre=${value}`}
              aria-current={filter === value ? "page" : undefined}
              className={`rounded-rp border border-[var(--edge)] px-3.5 py-2 text-[13px] font-semibold ${
                filter === value
                  ? "sel text-[var(--ink)]"
                  : "bg-[var(--glass2)] text-[var(--ink2)]"
              }`}
            >
              {value === "open" && open.length > 0
                ? `${t("filterOpen")} · ${open.length}`
                : t(`filter_${value}`)}
            </Link>
          ))}
        </nav>
      </header>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(166px,1fr))] gap-2.5">
        {totals.map((total) => (
          <div
            key={total.label}
            className="glass flex flex-col gap-1 rounded-r3 px-4 py-3.5"
          >
            <span className={`truncate ${micro}`}>{total.label}</span>
            <span
              className={`tnum font-display text-[21px] font-extrabold tracking-[-.03em] ${total.tone}`}
            >
              {total.value}
            </span>
            <span
              className="truncate text-[12px] text-[var(--ink2)]"
              title={total.sub}
            >
              {total.sub}
            </span>
          </div>
        ))}
      </div>

      <div className="grid gap-3.5 @5xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] @5xl:items-start">
        <BillingTable
          rows={shown.map((r) => ({ ...r, initials: initialsOf(r.name) }))}
          total={rows.length}
          open={open.map((r) => ({ id: r.id, amountCents: r.amountCents }))}
          selectedId={selected?.id ?? null}
          filter={filter}
          period={period}
          nextMonth={nextMonth}
        />

        {selected && (
          <BillingInspector
            companyReady={companyReady}
            problem={
              params.probleme === "entreprise" || params.probleme === "echec"
                ? params.probleme
                : null
            }
            client={
              {
                ...selected,
                initials: initialsOf(selected.name),
              } satisfies BillingClient
            }
            period={period}
            periodLabel={periodLabel}
          />
        )}
      </div>
    </div>
  );
}
